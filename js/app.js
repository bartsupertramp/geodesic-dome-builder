/**
 * App - Główny kontroler aplikacji 4V Geodesic Dome Builder & Structural Analyzer
 * Łączy:
 * 1. Moduł Geometrii, Wycinania Kątowego i Węzłów Rurowych 2D/3D
 * 2. Moduł Analizy Wytrzymałościowej Eurocode 5 / Eurocode 3 (Wybór Drewno / Stal & Łączniki ze Ścianką Rury t)
 * 3. Wizualizację Mapy Naprężeń 3D (Stress Heat Map)
 */

document.addEventListener('DOMContentLoaded', () => {
    const geoMath = new GeodesicMath();
    const structEngine = new StructuralEngine();
    const inspector = new NodeInspector('canvas-2d', 'node-detail-content');

    // Domyślnie zawsze używaj precyzyjnego modelu sferycznego 3D
    inspector.setDrillingMode('SPHERICAL');

    let currentDomeData = null;
    let currentStructuralResult = null;
    let activeTab = 'GEOMETRY'; // 'GEOMETRY' lub 'STRENGTH'
    let selectedStrutId = null;

    // Elementy UI Nawigacji Zakładek
    const tabBtnGeometry = document.getElementById('tab-btn-geometry');
    const tabBtnStrength = document.getElementById('tab-btn-strength');

    const panelLeftGeometry = document.getElementById('panel-left-geometry');
    const panelLeftStrength = document.getElementById('panel-left-strength');
    const panelRightGeometry = document.getElementById('panel-right-geometry');
    const panelRightStrength = document.getElementById('panel-right-strength');
    const drawerGeometry = document.getElementById('drawer-geometry');
    const drawerStrength = document.getElementById('drawer-strength');

    const heatmapLegendHud = document.getElementById('heatmap-legend-hud');
    const btnExportReport = document.getElementById('btn-export-report');
    const btnExportCSV = document.getElementById('btn-export-csv');
    const btnPrint = document.getElementById('btn-print');

    // Elementy UI Geometrii
    const inputRadius = document.getElementById('input-radius');
    const inputPipeOD = document.getElementById('input-pipe-od');
    const inputPipeWallT = document.getElementById('input-pipe-wall-t');
    const inputTimberW = document.getElementById('input-timber-w');
    const inputTimberH = document.getElementById('input-timber-h');
    const selectFrequency = document.getElementById('select-frequency');
    const selectTrunc = document.getElementById('select-truncation');
    const btnRecalculate = document.getElementById('btn-recalculate');

    // Elementy UI Wytrzymałości (Wybór materiału i obciążenia)
    const selectMaterialType = document.getElementById('select-material-type');
    const selectTimberGrade = document.getElementById('select-timber-grade');
    const selectBeamSteelGrade = document.getElementById('select-beam-steel-grade');
    const groupTimberGrade = document.getElementById('group-timber-grade');
    const groupSteelGradeBeams = document.getElementById('group-steel-grade-beams');
    const structMaterialInfoText = document.getElementById('struct-material-info-text');

    const selectStructSteelGrade = document.getElementById('select-struct-steel-grade');
    const selectStructBoltSize = document.getElementById('select-struct-bolt-size');
    const selectStructSnowZone = document.getElementById('select-struct-snow-zone');
    const inputStructCoveringWeight = document.getElementById('input-struct-covering-weight');
    const selectStructWindZone = document.getElementById('select-struct-wind-zone');
    const inputStructApexLoad = document.getElementById('input-struct-apex-load');
    const btnRecalculateStruct = document.getElementById('btn-recalculate-struct');

    // Elementy Widoku 3D
    const selectMode = document.getElementById('select-display-mode');
    const chkShowNodeLabels = document.getElementById('chk-show-node-labels');
    const chkShowStrutLabels = document.getElementById('chk-show-strut-labels');
    const inputLabelScale = document.getElementById('input-label-scale');

    // Inicjalizacja Three.js 3D
    const threeApp = new ThreeApp('canvas-3d-container', {
        onNodeSelect: (nodeData) => {
            if (activeTab === 'STRENGTH') {
                renderStructuralNodeAudit(nodeData.id);
            } else {
                if (currentDomeData) {
                    inspector.renderNode(nodeData, currentDomeData);
                }
            }
        },
        onStrutSelect: (edgeData) => {
            selectedStrutId = edgeData.id;
            if (activeTab === 'STRENGTH') {
                renderStructuralStrutAudit(edgeData.id);
                highlightStrutRowInTable(edgeData.id);
            } else {
                const v1Node = currentDomeData.vertices[edgeData.v1];
                inspector.renderNode(v1Node, currentDomeData);
                threeApp.highlightStrutVariant(edgeData.variantCode);
            }
        }
    });

    function getGeometryParamsFromUI() {
        return {
            radius: parseFloat(inputRadius.value) || 3.0,
            pipeOD: parseFloat(inputPipeOD.value) || 110.0,
            pipeWallT: parseFloat(inputPipeWallT ? inputPipeWallT.value : 4.0) || 4.0,
            timberW: parseFloat(inputTimberW.value) || 45.0,
            timberH: parseFloat(inputTimberH.value) || 95.0,
            frequency: parseInt(selectFrequency ? selectFrequency.value : 4) || 4,
            truncation: parseFloat(selectTrunc.value) || 0.5
        };
    }

    function getStructuralParamsFromUI() {
        const geoParams = getGeometryParamsFromUI();
        return {
            timberB: geoParams.timberW,
            timberH: geoParams.timberH,
            pipeOD: geoParams.pipeOD,
            pipeWallT: geoParams.pipeWallT,
            materialType: selectMaterialType ? selectMaterialType.value : 'TIMBER',
            timberGrade: selectTimberGrade ? selectTimberGrade.value : 'C24',
            beamSteelGrade: selectBeamSteelGrade ? selectBeamSteelGrade.value : 'S235',
            steelGrade: selectStructSteelGrade ? selectStructSteelGrade.value : 'S235',
            boltD: parseFloat(selectStructBoltSize ? selectStructBoltSize.value : 12.0) || 12.0,
            snowZone: parseInt(selectStructSnowZone ? selectStructSnowZone.value : 2) || 2,
            coveringWeight: parseFloat(inputStructCoveringWeight ? inputStructCoveringWeight.value : 25.0) || 25.0,
            windZone: parseInt(selectStructWindZone ? selectStructWindZone.value : 1) || 1,
            apexPointLoad: parseFloat(inputStructApexLoad ? inputStructApexLoad.value : 150.0) || 150.0
        };
    }

    function updateMaterialTypeUI() {
        if (!selectMaterialType) return;
        const isTimber = selectMaterialType.value === 'TIMBER';
        if (groupTimberGrade) groupTimberGrade.style.display = isTimber ? 'flex' : 'none';
        if (groupSteelGradeBeams) groupSteelGradeBeams.style.display = isTimber ? 'none' : 'flex';

        if (structMaterialInfoText) {
            if (isTimber) {
                const grade = selectTimberGrade ? selectTimberGrade.value : 'C24';
                if (grade === 'C18') {
                    structMaterialInfoText.innerHTML = '<strong>Drewno C18:</strong> fm,k=18 MPa, fc,0,k=18 MPa, E=9 GPa, γM=1.3, kmod=0.8';
                } else if (grade === 'C24') {
                    structMaterialInfoText.innerHTML = '<strong>Drewno C24:</strong> fm,k=24 MPa, fc,0,k=21 MPa, E=11 GPa, γM=1.3, kmod=0.8';
                } else if (grade === 'C30') {
                    structMaterialInfoText.innerHTML = '<strong>Drewno C30:</strong> fm,k=30 MPa, fc,0,k=23 MPa, E=12 GPa, γM=1.3, kmod=0.8';
                } else if (grade === 'GL24h') {
                    structMaterialInfoText.innerHTML = '<strong>Drewno Klejone GL24h (BSH):</strong> fm,k=24 MPa, fc,0,k=24 MPa, E=11.5 GPa, γM=1.25, kmod=0.8';
                } else if (grade === 'GL28h') {
                    structMaterialInfoText.innerHTML = '<strong>Drewno Klejone GL28h (BSH):</strong> fm,k=28 MPa, fc,0,k=28 MPa, E=12.6 GPa, γM=1.25, kmod=0.8';
                }
            } else {
                const sGrade = selectBeamSteelGrade ? selectBeamSteelGrade.value : 'S235';
                if (sGrade === 'S235') {
                    structMaterialInfoText.innerHTML = '<strong>Stal S235:</strong> fy=235 MPa, fu=360 MPa, E=210 GPa, γM0=1.0, γM1=1.0';
                } else {
                    structMaterialInfoText.innerHTML = '<strong>Stal S355:</strong> fy=355 MPa, fu=510 MPa, E=210 GPa, γM0=1.0, γM1=1.0';
                }
            }
        }
    }

    // Aktualizacja zafiksowanych plakietek w karcie wytrzymałości
    function updateLockedGeometryDisplay(domeData) {
        if (!domeData) return;
        const dispRadius = document.getElementById('struct-display-radius');
        const dispFreq = document.getElementById('struct-display-frequency');
        const dispTimber = document.getElementById('struct-display-timber');
        const dispPipeOD = document.getElementById('struct-display-pipe-od');
        const dispTrunc = document.getElementById('struct-display-trunc');

        if (dispRadius) dispRadius.textContent = `${domeData.radius.toFixed(1)} m`;
        if (dispFreq) dispFreq.textContent = `${domeData.frequency}V (${domeData.edges.length} belek)`;
        if (dispTimber) dispTimber.textContent = `${domeData.timberWMm} × ${domeData.timberHMm} mm`;
        if (dispPipeOD) dispPipeOD.textContent = `Ø ${domeData.pipeODMm} × ${domeData.pipeWallTMm} mm`;

        let truncText = '1/2 Kopuły (Podwalina Y=0)';
        if (selectTrunc) {
            const val = parseFloat(selectTrunc.value);
            if (val === 0.375) truncText = '3/8 Kopuły (Niska)';
            else if (val === 0.625) truncText = '5/8 Kopuły (Wysoka)';
        }
        if (dispTrunc) dispTrunc.textContent = truncText;
    }

    function updateGeometry() {
        inspector.setDrillingMode('SPHERICAL');
        threeApp.setStrutAlignment('PANEL_FLUSH');

        const params = getGeometryParamsFromUI();
        currentDomeData = geoMath.calculateDome(params);

        threeApp.setDisplayMode(selectMode.value);
        threeApp.setShowNodeLabels(chkShowNodeLabels ? chkShowNodeLabels.checked : true);
        threeApp.setShowStrutLabels(chkShowStrutLabels ? chkShowStrutLabels.checked : true);
        
        if (inputLabelScale) {
            threeApp.setLabelScale(parseFloat(inputLabelScale.value) || 0.5);
        }

        // Zaktualizuj zafiksowane wartości w karcie wytrzymałości
        updateLockedGeometryDisplay(currentDomeData);

        // Przelicz od razu analizę wytrzymałościową z nowymi wymiarami
        updateStructuralAnalysis();

        threeApp.buildDome3D(currentDomeData);

        const firstPentagon = currentDomeData.vertices.find(v => v.type === 'PENTAGON') || currentDomeData.vertices[0];
        if (firstPentagon && activeTab === 'GEOMETRY') {
            inspector.renderNode(firstPentagon, currentDomeData);
            threeApp.selectNodeById(firstPentagon.id);
        }

        renderStrutVariantTable(currentDomeData);
        renderNodeTypeTable(currentDomeData);
    }

    function updateStructuralAnalysis() {
        if (!currentDomeData) return;

        updateLockedGeometryDisplay(currentDomeData);
        updateMaterialTypeUI();

        const structParams = getStructuralParamsFromUI();
        currentStructuralResult = structEngine.analyzeDome(currentDomeData, structParams);

        threeApp.setStructuralData(currentStructuralResult);

        // Aktualizuj wskaźniki w UI
        renderGlobalStructuralStatus(currentStructuralResult);
        renderStructuralMaterialMass(currentStructuralResult);
        renderStructuralStrutsTable(currentStructuralResult);

        // Wybierz krytyczną belkę lub poprzednio zaznaczoną
        if (currentStructuralResult.criticalElement) {
            const targetId = selectedStrutId !== null ? selectedStrutId : currentStructuralResult.criticalElement.edgeId;
            renderStructuralStrutAudit(targetId);
            if (activeTab === 'STRENGTH') {
                threeApp.selectStrutById(targetId);
            }
        }
    }

    function renderGlobalStructuralStatus(result) {
        if (!result) return;

        const pill = document.getElementById('struct-status-pill');
        const fill = document.getElementById('struct-max-util-fill');
        const text = document.getElementById('struct-max-util-text');
        const critCode = document.getElementById('struct-crit-code');
        const critKc = document.getElementById('struct-crit-kc');
        const critLambda = document.getElementById('struct-crit-lambda');

        const maxU = parseFloat(result.maxUtilizationPct);

        if (pill) {
            pill.className = `status-pill ${result.overallStatus === 'SAFE' ? 'status-safe' : (result.overallStatus === 'WARNING' ? 'status-warning' : 'status-critical')}`;
            pill.textContent = result.overallStatus === 'SAFE' ? 'BEZPIECZNA' : (result.overallStatus === 'WARNING' ? 'WYSOKIE OBCIĄŻENIE' : 'PRZEKROCZENIE NOŚNOŚCI');
        }

        if (fill) {
            fill.style.width = `${Math.min(100, maxU)}%`;
            fill.style.backgroundColor = structEngine.getHeatMapColor(maxU / 100.0);
        }

        if (text) {
            text.textContent = `Max Wytężenie: ${result.maxUtilizationPct}%`;
        }

        if (result.criticalElement) {
            if (critCode) critCode.textContent = `Belka #${result.criticalElement.edgeId + 1} (${result.criticalElement.variantCode}) [${result.criticalElement.N_Ed_kN} kN]`;
            if (critKc) critKc.textContent = `kc = ${result.criticalElement.kc}`;
            if (critLambda) critLambda.textContent = `λ = ${result.criticalElement.lambda}`;
        }
    }

    function renderStructuralStrutAudit(edgeId) {
        const container = document.getElementById('struct-element-detail');
        if (!container || !currentStructuralResult) return;

        const strut = currentStructuralResult.struts[edgeId];
        if (!strut) return;

        const edge = currentDomeData.edges[edgeId];
        const utilColor = strut.heatColor;
        const uPct = strut.utilizationPct.toFixed(1);
        const isTimber = currentStructuralResult.materialType === 'TIMBER';

        let html = `
            <div class="audit-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span class="strut-tag" style="background-color:${edge.color || '#00d1b2'}">${edge.variantCode || edge.strutType}</span>
                        <strong style="font-size:14px; margin-left:6px; color:#ffffff;">Belka #${strut.edgeId + 1}</strong>
                    </div>
                    <span class="status-pill ${strut.totalUtil <= 0.85 ? 'status-safe' : (strut.totalUtil <= 1.0 ? 'status-warning' : 'status-critical')}">
                        ${strut.status}
                    </span>
                </div>

                <!-- Pasek wytężenia -->
                <div class="util-bar-container">
                    <div class="util-bar-fill" style="width:${Math.min(100, strut.totalUtil * 100)}%; background-color:${utilColor};"></div>
                    <span class="util-bar-text">Współczynnik wytężenia η = ${uPct}%</span>
                </div>

                <!-- Siatka statystyk SGN -->
                <div class="strength-stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Siła osiowa N,Ed</span>
                        <span class="stat-value" style="color:${strut.isCompression ? '#ff4136' : '#00d1b2'}">
                            ${strut.N_Ed_kN.toFixed(2)} kN (${strut.isCompression ? 'Ściskanie' : 'Rozciąganie'})
                        </span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Moment gnący My,Ed</span>
                        <span class="stat-value">${(strut.sigma_m_MPa * (currentStructuralResult.timberSummary.timberB * Math.pow(currentStructuralResult.timberSummary.timberH, 2) / 6.0) * 1e-3).toFixed(1)} N·m</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Wyboczenie (${isTimber ? 'EC5 kc' : 'EC3 χ'})</span>
                        <span class="stat-value">kc = ${strut.kc.toFixed(3)} (λ = ${strut.lambda.toFixed(1)})</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Naprężenie osiowe</span>
                        <span class="stat-value">${strut.sigma_axial_MPa.toFixed(2)} MPa</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Naprężenie zginające</span>
                        <span class="stat-value">${strut.sigma_m_MPa.toFixed(2)} MPa / ${currentStructuralResult.timberSummary.fm_d} MPa</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Docisk w siodle</span>
                        <span class="stat-value">${(strut.saddleUtil * 100).toFixed(1)}% (${currentStructuralResult.materialName})</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Ścianka rury stalowej t</span>
                        <span class="stat-value">${(strut.steelWallUtil * 100).toFixed(1)}% (${currentStructuralResult.steelSummary.pipeWallT} mm ${currentStructuralResult.steelSummary.grade})</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Ugięcie sprężyste u</span>
                        <span class="stat-value">${strut.u_inst_mm.toFixed(2)} mm (granica: ${strut.u_limit_mm.toFixed(1)} mm)</span>
                    </div>
                </div>

                <div style="font-size:11px; background:#161e27; padding:8px; border-radius:6px; border:1px solid var(--panel-border); color:#cbd5e1; line-height:1.4;">
                    <strong>Weryfikacja Normowa (${isTimber ? 'Eurokod 5' : 'Eurokod 3'}):</strong><br>
                    • Materiał belki (${currentStructuralResult.materialName}): <strong>${(strut.woodUtil * 100).toFixed(1)}%</strong><br>
                    • Oparcie czołowe siodła na rurze: <strong>${(strut.saddleUtil * 100).toFixed(1)}%</strong><br>
                    • Ścianka rury stalowej t = ${currentStructuralResult.steelSummary.pipeWallT} mm: <strong>${(strut.steelWallUtil * 100).toFixed(1)}%</strong>
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function renderStructuralNodeAudit(nodeId) {
        const container = document.getElementById('struct-element-detail');
        if (!container || !currentStructuralResult) return;

        const node = currentStructuralResult.nodes[nodeId];
        if (!node) return;

        const vert = currentDomeData.vertices[nodeId];
        const uPct = node.utilizationPct.toFixed(1);

        let html = `
            <div class="audit-card">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span class="strut-tag" style="background-color:${vert.nodeTypeColor || '#00d1b2'}">${vert.nodeTypeCode || 'W'}</span>
                        <strong style="font-size:14px; margin-left:6px; color:#ffffff;">Węzeł #${node.nodeId + 1}</strong>
                    </div>
                    <span class="status-pill ${node.utilizationPct <= 85 ? 'status-safe' : (node.utilizationPct <= 100 ? 'status-warning' : 'status-critical')}">
                        ${node.utilizationPct <= 85 ? 'BEZPIECZNY' : (node.utilizationPct <= 100 ? 'WYSOKIE OBCIĄŻENIE' : 'PRZEKROCZENIE')}
                    </span>
                </div>

                <div class="util-bar-container">
                    <div class="util-bar-fill" style="width:${Math.min(100, node.utilizationPct)}%; background-color:${node.heatColor};"></div>
                    <span class="util-bar-text">Wytężenie węzła rurowego = ${uPct}%</span>
                </div>

                <div class="strength-stat-grid">
                    <div class="stat-item">
                        <span class="stat-label">Liczba ramion (belek)</span>
                        <span class="stat-value">${node.connectedEdgesCount} belek</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Maks. siła z belki</span>
                        <span class="stat-value">${node.maxForceKN.toFixed(2)} kN</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Suma sił dochodzących</span>
                        <span class="stat-value">${node.sumForceKN.toFixed(2)} kN</span>
                    </div>

                    <div class="stat-item">
                        <span class="stat-label">Ścianka rury t</span>
                        <span class="stat-value">${currentStructuralResult.steelSummary.pipeWallT} mm (${currentStructuralResult.steelSummary.grade})</span>
                    </div>
                </div>

                <div style="font-size:11px; background:#161e27; padding:8px; border-radius:6px; border:1px solid var(--panel-border); color:#cbd5e1; line-height:1.4;">
                    <strong>Konstrukcja Węzła:</strong><br>
                    • Rura stalowa zewnętrzna: \(\varnothing ${currentStructuralResult.steelSummary.pipeOD}\text{ mm}\), grubość ścianki \(t = ${currentStructuralResult.steelSummary.pipeWallT}\text{ mm}\)<br>
                    • Śruba przelotowa: \(M${currentStructuralResult.steelSummary.boltD}\) klasa ${currentStructuralResult.steelSummary.boltClass}<br>
                    • Belki posiadają frezowane siodło oparte o zewnętrzny płaszcz cylindra rury.
                </div>
            </div>
        `;

        container.innerHTML = html;
    }

    function renderStructuralMaterialMass(result) {
        const container = document.getElementById('struct-material-mass-summary');
        if (!container || !result) return;

        let html = `
            <table class="cut-table full-width">
                <tbody>
                    <tr>
                        <td><strong>Materiał Belek:</strong></td>
                        <td><span style="color:#00d1b2; font-weight:bold;">${result.materialName}</span></td>
                    </tr>
                    <tr>
                        <td><strong>Przekrój Belek:</strong></td>
                        <td><strong>${result.timberSummary.timberB} × ${result.timberSummary.timberH} mm</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Objętość Materiału Belek:</strong></td>
                        <td>${result.timberSummary.totalVolumeM3} m³</td>
                    </tr>
                    <tr>
                        <td><strong>Masa Belek:</strong></td>
                        <td><strong>${result.timberSummary.totalWeightKg} kg</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Łączniki Stalowe:</strong></td>
                        <td>${result.steelSummary.totalHubsCount} szt. (\(\varnothing ${result.steelSummary.pipeOD} \times ${result.steelSummary.pipeWallT}\text{ mm}\))</td>
                    </tr>
                    <tr>
                        <td><strong>Masa Rur Stalowych:</strong></td>
                        <td><strong>${result.steelSummary.totalWeightKg} kg</strong></td>
                    </tr>
                    <tr>
                        <td><strong>Całkowita Siła Pionowa SGN:</strong></td>
                        <td><strong style="color:#ffdd57;">${result.loadsSummary.totalVerticalLoadKN} kN</strong></td>
                    </tr>
                </tbody>
            </table>
        `;

        container.innerHTML = html;
    }

    function renderStructuralStrutsTable(result) {
        const container = document.getElementById('struct-all-struts-summary');
        if (!container || !result) return;

        let html = `
            <div style="max-height: 155px; overflow-y: auto;">
                <table class="cut-table full-width">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Typ</th>
                            <th>Dł. [mm]</th>
                            <th>Siła N,Ed</th>
                            <th>Wyboczenie kc</th>
                            <th>Materiał Belki</th>
                            <th>Siodło</th>
                            <th>Ścianka t</th>
                            <th>Wytężenie Max η</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        // Posortuj od najbardziej obciążonych
        const sortedStruts = [...result.struts].sort((a, b) => b.totalUtil - a.totalUtil);

        sortedStruts.forEach(s => {
            const edge = currentDomeData.edges[s.edgeId];
            const uPct = (s.totalUtil * 100).toFixed(1);

            html += `
                <tr class="struct-strut-row" data-edge-id="${s.edgeId}" style="cursor:pointer;" title="Kliknij, aby podświetlić belkę #${s.edgeId + 1} w 3D">
                    <td><strong>#${s.edgeId + 1}</strong></td>
                    <td><span class="strut-tag" style="background-color:${edge.color || '#00d1b2'}">${s.variantCode}</span></td>
                    <td>${s.lengthMm.toFixed(0)}</td>
                    <td style="color:${s.isCompression ? '#ff4136' : '#00d1b2'}"><strong>${s.N_Ed_kN.toFixed(2)} kN</strong></td>
                    <td>${s.kc.toFixed(3)}</td>
                    <td>${(s.woodUtil * 100).toFixed(1)}%</td>
                    <td>${(s.saddleUtil * 100).toFixed(1)}%</td>
                    <td>${(s.steelWallUtil * 100).toFixed(1)}%</td>
                    <td><strong style="color:${s.heatColor}">${uPct}%</strong></td>
                    <td><span class="status-pill ${s.totalUtil <= 0.85 ? 'status-safe' : (s.totalUtil <= 1.0 ? 'status-warning' : 'status-critical')}" style="padding:2px 6px; font-size:10px;">${s.status}</span></td>
                </tr>
            `;
        });

        html += `
                    </tbody>
                </table>
            </div>
        `;

        container.innerHTML = html;

        container.querySelectorAll('.struct-strut-row').forEach(row => {
            row.addEventListener('click', () => {
                const eId = parseInt(row.getAttribute('data-edge-id'));
                selectedStrutId = eId;
                threeApp.selectStrutById(eId);
                renderStructuralStrutAudit(eId);
                highlightStrutRowInTable(eId);
            });
        });
    }

    function highlightStrutRowInTable(edgeId) {
        document.querySelectorAll('.struct-strut-row').forEach(row => {
            if (parseInt(row.getAttribute('data-edge-id')) === edgeId) {
                row.style.backgroundColor = 'rgba(0, 209, 178, 0.2)';
            } else {
                row.style.backgroundColor = '';
            }
        });
    }

    function renderStrutVariantTable(domeData) {
        const container = document.getElementById('cut-list-summary');
        if (!container) return;

        let totalStruts = 0;
        let totalMeterageAll = 0;

        let html = `
            <table class="cut-table full-width">
                <thead>
                    <tr>
                        <th>Kod</th>
                        <th>Wariant Belki</th>
                        <th>Dł. Środek</th>
                        <th>Dł. Docięcia</th>
                        <th>Zacięcie Lewe</th>
                        <th>Zacięcie Prawe</th>
                        <th>Liczba</th>
                        <th>Suma Metrów</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.values(domeData.summaryByStrutVariant).forEach(v => {
            totalStruts += v.count;
            totalMeterageAll += parseFloat(v.totalMeterage);

            const mLStr = v.miterLeftDeg === 0 ? '<span style="color:#ffdd57">0° (Proste)</span>' : `${v.miterLeftDeg.toFixed(1)}°`;
            const mRStr = v.miterRightDeg === 0 ? '<span style="color:#ffdd57">0° (Proste)</span>' : `${v.miterRightDeg.toFixed(1)}°`;

            html += `
                <tr class="strut-variant-row" data-code="${v.variantCode}" style="cursor:pointer;" title="Kliknij, aby podświetlić belki ${v.variantCode} na modelu 3D">
                    <td><span class="strut-tag" style="background-color:${v.color}">${v.variantCode}</span></td>
                    <td><strong>${v.name}</strong> (Typ ${v.baseType})</td>
                    <td>${v.centerLenMm} mm</td>
                    <td><strong style="color:#00d1b2">${v.cutLenMm} mm</strong></td>
                    <td>${mLStr}</td>
                    <td>${mRStr}</td>
                    <td><strong>${v.count} szt.</strong></td>
                    <td>${v.totalMeterage} m</td>
                </tr>
            `;
        });

        html += `
                </tbody>
                <tfoot>
                    <tr class="table-total">
                        <td colspan="6"><strong>RAZEM WSZYSTKIE BELKI:</strong></td>
                        <td><strong style="font-size:14px; color:#00d1b2;">${totalStruts} szt.</strong></td>
                        <td><strong style="font-size:14px; color:#00d1b2;">${totalMeterageAll.toFixed(2)} m</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;

        container.innerHTML = html;

        container.querySelectorAll('.strut-variant-row').forEach(row => {
            row.addEventListener('click', () => {
                const code = row.getAttribute('data-code');
                threeApp.highlightStrutVariant(code);
            });
        });
    }

    function renderNodeTypeTable(domeData) {
        const container = document.getElementById('node-type-summary');
        if (!container) return;

        let totalNodes = 0;

        let html = `
            <table class="cut-table full-width">
                <thead>
                    <tr>
                        <th>Kod</th>
                        <th>Opis Rodzaju Węzła</th>
                        <th>Układ Belek</th>
                        <th>Ramiona</th>
                        <th>Liczba Sztuk</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.values(domeData.summaryByNodeType).forEach(nt => {
            totalNodes += nt.count;

            html += `
                <tr class="node-type-row" data-code="${nt.code}" style="cursor:pointer;" title="Kliknij, aby podświetlić węzły ${nt.code} na modelu 3D">
                    <td><span class="strut-tag" style="background-color:${nt.color}">${nt.code}</span></td>
                    <td><strong>${nt.description}</strong></td>
                    <td><code>${nt.strutPattern}</code></td>
                    <td>${nt.valency} ramion</td>
                    <td><strong style="color:#00d1b2; font-size:14px;">${nt.count} szt.</strong></td>
                </tr>
            `;
        });

        html += `
                </tbody>
                <tfoot>
                    <tr class="table-total">
                        <td colspan="4"><strong>SUMA WSZYSTKICH WĘZŁÓW:</strong></td>
                        <td><strong style="font-size:15px; color:#00d1b2;">${totalNodes} szt.</strong></td>
                    </tr>
                </tfoot>
            </table>
        `;

        container.innerHTML = html;

        container.querySelectorAll('.node-type-row').forEach(row => {
            row.addEventListener('click', () => {
                const code = row.getAttribute('data-code');
                threeApp.highlightNodeType(code);
                const sampleNode = domeData.vertices.find(v => v.nodeTypeCode === code);
                if (sampleNode) {
                    inspector.renderNode(sampleNode, domeData);
                    threeApp.selectNodeById(sampleNode.id);
                }
            });
        });
    }

    function switchTab(tab) {
        activeTab = tab;

        if (tab === 'GEOMETRY') {
            tabBtnGeometry.classList.add('active');
            tabBtnStrength.classList.remove('active');

            panelLeftGeometry.classList.remove('hidden');
            panelLeftStrength.classList.add('hidden');

            panelRightGeometry.classList.remove('hidden');
            panelRightStrength.classList.add('hidden');

            drawerGeometry.classList.remove('hidden');
            drawerStrength.classList.add('hidden');

            if (heatmapLegendHud) heatmapLegendHud.style.display = 'none';
            if (btnExportReport) btnExportReport.style.display = 'none';

            selectMode.value = 'STRUT_TYPES';
            threeApp.setDisplayMode('STRUT_TYPES');
        } else {
            tabBtnGeometry.classList.remove('active');
            tabBtnStrength.classList.add('active');

            panelLeftGeometry.classList.add('hidden');
            panelLeftStrength.classList.remove('hidden');

            panelRightGeometry.classList.add('hidden');
            panelRightStrength.classList.remove('hidden');

            drawerGeometry.classList.add('hidden');
            drawerStrength.classList.remove('hidden');

            if (heatmapLegendHud) heatmapLegendHud.style.display = 'flex';
            if (btnExportReport) btnExportReport.style.display = 'inline-flex';

            updateStructuralAnalysis();

            selectMode.value = 'STRESS_HEATMAP';
            threeApp.setDisplayMode('STRESS_HEATMAP');
        }
    }

    function exportToCSV() {
        if (!currentDomeData) return;

        let csvContent = "data:text/csv;charset=utf-8,";
        
        csvContent += `=== DOKLADNA LISTA CIEC BELEK (CZIESTOTLIWOSC: ${currentDomeData.frequency}V) ===\n`;
        csvContent += "Kod Wariantu;Typ Glowny;Nazwa;Dlugosc Srodkowa (mm);Dlugosc Dociecia (mm);Zacicie Lewe (deg);Zaciecie Prawe (deg);Ilosc Sztuk;Suma Metrow (m)\n";

        Object.values(currentDomeData.summaryByStrutVariant).forEach(v => {
            csvContent += `${v.variantCode};${v.baseType};${v.name};${v.centerLenMm};${v.cutLenMm};${v.miterLeftDeg};${v.miterRightDeg};${v.count};${v.totalMeterage}\n`;
        });

        csvContent += "\n=== ZESTAWIENIE RODZAJOW WEZLOW (NODE TYPES W1-W7) ===\n";
        csvContent += "Kod Wezla;Opis Rodzaju;Uklad Belek;Liczba Ramion;Ilosc Sztuk w Konstrukcji\n";

        Object.values(currentDomeData.summaryByNodeType).forEach(nt => {
            csvContent += `${nt.code};${nt.description};${nt.strutPattern};${nt.valency};${nt.count}\n`;
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `plan_kopuly_${currentDomeData.frequency}V_R${currentDomeData.radius}m.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    function exportStructuralReport() {
        if (!currentStructuralResult || !currentDomeData) return;

        const res = currentStructuralResult;
        let report = `================================================================================\n`;
        report += `    RAPORT OBLICZENIOWY STATYCZNO-WYTRZYMALOSCIOWY KOPULY GEODEZYJNEJ\n`;
        report += `    Normy: Eurokod 5 (PN-EN 1995-1-1 / PN-EN 338) & Eurokod 3 (PN-EN 1993-1-1 / 1-8)\n`;
        report += `================================================================================\n\n`;

        report += `1. PARAMETRY GEOMETRYCZNE (ZAFIKSOWANE Z PROJEKTU):\n`;
        report += ` - Czestotliwosc: ${currentDomeData.frequency}V\n`;
        report += ` - Promien R: ${currentDomeData.radius} m\n`;
        report += ` - Liczba wezlow: ${currentDomeData.vertices.length} szt.\n`;
        report += ` - Liczba belek: ${currentDomeData.edges.length} szt.\n\n`;

        report += `2. MATERIALY I PRZEKROJE:\n`;
        report += ` - Typ i klasa materialu belek: ${res.materialName}\n`;
        report += ` - Przekroj belki: ${res.timberSummary.timberB} x ${res.timberSummary.timberH} mm\n`;
        report += ` - Wytrzymalosc obliczeniowa na sciskanie: ${res.timberSummary.fc0_d} MPa\n`;
        report += ` - Wytrzymalosc obliczeniowa na zginanie: ${res.timberSummary.fm_d} MPa\n`;
        report += ` - Modul sprezystosci E: ${res.timberSummary.E0_mean} MPa\n`;
        report += ` - Lacznik: Rura stalowa ${res.steelSummary.grade} fi ${res.steelSummary.pipeOD} mm, scianka t = ${res.steelSummary.pipeWallT} mm\n`;
        report += ` - Oparcie: Czelowe siodlo frezowane do luku rury stalowej\n`;
        report += ` - Sruba: M${res.steelSummary.boltD} kl. ${res.steelSummary.boltClass}\n\n`;

        report += `3. ZALOZENIA OBCIAZEN:\n`;
        report += ` - Snieg: Strefa ${res.loadsSummary.snowZone} (sk = ${res.loadsSummary.snowSk} kN/m2)\n`;
        report += ` - Wiatr: Strefa ${res.loadsSummary.windZone} (qb = ${res.loadsSummary.windQb} kN/m2)\n`;
        report += ` - Poszycie dachu: ${res.loadsSummary.coveringWeightKgM2} kg/m2\n`;
        report += ` - Obciazenie szczytowe (Apex): ${res.loadsSummary.apexPointLoadKg} kg\n`;
        report += ` - Calkowita sila pionowa kombinacji SGN: ${res.loadsSummary.totalVerticalLoadKN} kN\n\n`;

        report += `4. WYNIKI WERYFIKACJI SGN I SGU:\n`;
        report += ` - Status konstrukcji: ${res.overallStatus === 'SAFE' ? 'BEZPIECZNA' : 'PRZEKROCZENIE NOSNOSCI'}\n`;
        report += ` - Maksymalne wytezenie w konstrukcji: ${res.maxUtilizationPct} %\n`;
        if (res.criticalElement) {
            report += ` - Krytyczny element: Belka #${res.criticalElement.edgeId + 1} (${res.criticalElement.variantCode})\n`;
            report += `   * Sila osiowa N,Ed: ${res.criticalElement.N_Ed_kN} kN (${res.criticalElement.forceType})\n`;
            report += `   * Wspolczynnik wyboczenia kc: ${res.criticalElement.kc} (Smuklosc lambda = ${res.criticalElement.lambda})\n`;
            report += `   * Tryb decydujacy: ${res.criticalElement.jointMode}\n`;
        }
        report += `\n5. ZESTAWIENIE MAS:\n`;
        report += ` - Objetosc belek: ${res.timberSummary.totalVolumeM3} m3 (Masa: ${res.timberSummary.totalWeightKg} kg)\n`;
        report += ` - Masa stali lacznikow rurowych: ${res.steelSummary.totalWeightKg} kg\n`;

        const blob = new Blob([report], { type: "text/plain;charset=utf-8" });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `raport_wytrzymalosci_kopuly_${currentDomeData.frequency}V.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Event Listeners
    tabBtnGeometry.addEventListener('click', () => switchTab('GEOMETRY'));
    tabBtnStrength.addEventListener('click', () => switchTab('STRENGTH'));

    btnRecalculate.addEventListener('click', updateGeometry);
    btnRecalculateStruct.addEventListener('click', () => {
        updateStructuralAnalysis();
        if (activeTab === 'STRENGTH') {
            threeApp.setDisplayMode('STRESS_HEATMAP');
        }
    });

    selectMode.addEventListener('change', () => {
        threeApp.setDisplayMode(selectMode.value);
        if (heatmapLegendHud) {
            heatmapLegendHud.style.display = (selectMode.value === 'STRESS_HEATMAP' || activeTab === 'STRENGTH') ? 'flex' : 'none';
        }
    });

    if (selectFrequency) selectFrequency.addEventListener('change', updateGeometry);

    if (chkShowNodeLabels) {
        chkShowNodeLabels.addEventListener('change', () => {
            threeApp.setShowNodeLabels(chkShowNodeLabels.checked);
        });
    }

    if (chkShowStrutLabels) {
        chkShowStrutLabels.addEventListener('change', () => {
            threeApp.setShowStrutLabels(chkShowStrutLabels.checked);
        });
    }

    if (inputLabelScale) {
        inputLabelScale.addEventListener('input', () => {
            threeApp.setLabelScale(parseFloat(inputLabelScale.value) || 0.5);
        });
    }

    [inputRadius, inputPipeOD, inputPipeWallT, inputTimberW, inputTimberH, selectTrunc].forEach(input => {
        if (input) input.addEventListener('change', updateGeometry);
    });

    if (selectMaterialType) {
        selectMaterialType.addEventListener('change', () => {
            updateMaterialTypeUI();
            updateStructuralAnalysis();
        });
    }

    if (selectTimberGrade) {
        selectTimberGrade.addEventListener('change', () => {
            updateMaterialTypeUI();
            updateStructuralAnalysis();
        });
    }

    if (selectBeamSteelGrade) {
        selectBeamSteelGrade.addEventListener('change', () => {
            updateMaterialTypeUI();
            updateStructuralAnalysis();
        });
    }

    [
        selectStructSteelGrade, selectStructBoltSize,
        selectStructSnowZone, inputStructCoveringWeight, selectStructWindZone, inputStructApexLoad
    ].forEach(input => {
        if (input) {
            input.addEventListener('change', () => {
                updateStructuralAnalysis();
                if (activeTab === 'STRENGTH') {
                    threeApp.setDisplayMode('STRESS_HEATMAP');
                }
            });
        }
    });

    if (btnExportCSV) btnExportCSV.addEventListener('click', exportToCSV);
    if (btnExportReport) btnExportReport.addEventListener('click', exportStructuralReport);
    if (btnPrint) btnPrint.addEventListener('click', () => window.print());

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js?v=20260909_v3').then(() => {
            console.log('Service Worker zarejestrowany pomyślnie.');
        }).catch(err => {
            console.log('Błąd rejestracji Service Workera:', err);
        });
    }

    // Inicjalne uruchomienie
    updateMaterialTypeUI();
    updateGeometry();
});
