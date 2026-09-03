/**
 * App - Główny kontroler aplikacji Geodesic Dome Builder & Node Visualizer
 * Zintegrowany z Orientacją Belek pod Płyty Poszycia (Panel-Flush Alignment)
 * oraz Trójwymiarową Przeglądarką 3D Węzła (3D Node Inspector).
 */

document.addEventListener('DOMContentLoaded', () => {
    const geoMath = new GeodesicMath();
    
    const inspector = new NodeInspector('canvas-2d', 'node-detail-content');

    const threeApp = new ThreeApp('canvas-3d-container', {
        onNodeSelect: (nodeData) => {
            if (currentDomeData) {
                inspector.renderNode(nodeData, currentDomeData);
            }
        },
        onStrutSelect: (edgeData) => {
            if (currentDomeData) {
                inspector.renderStrut(edgeData, currentDomeData);
                threeApp.highlightStrutVariant(edgeData.variantCode);
            }
        }
    });

    let currentDomeData = null;

    const inputRadius = document.getElementById('input-radius');
    const inputPipeOD = document.getElementById('input-pipe-od');
    const inputTimberW = document.getElementById('input-timber-w');
    const inputTimberH = document.getElementById('input-timber-h');
    
    const selectFrequency = document.getElementById('select-frequency');
    const selectDrillingMode = document.getElementById('select-drilling-mode');
    const selectTrunc = document.getElementById('select-truncation');
    const selectMode = document.getElementById('select-display-mode');

    const chkShowNodeLabels = document.getElementById('chk-show-node-labels');
    const chkShowStrutLabels = document.getElementById('chk-show-strut-labels');
    const inputLabelScale = document.getElementById('input-label-scale');
    const selectLabelType = document.getElementById('select-label-type');

    const btnRecalculate = document.getElementById('btn-recalculate');
    const btnExportCSV = document.getElementById('btn-export-csv');
    const btnPrint = document.getElementById('btn-print');

    function getParamsFromUI() {
        return {
            radius: parseFloat(inputRadius.value) || 3.0,
            pipeOD: parseFloat(inputPipeOD.value) || 110.0,
            timberW: parseFloat(inputTimberW.value) || 45.0,
            timberH: parseFloat(inputTimberH.value) || 45.0,
            frequency: parseInt(selectFrequency ? selectFrequency.value : 4) || 4,
            truncation: parseFloat(selectTrunc.value) || 0.5
        };
    }

    function updateApp() {
        if (selectDrillingMode) {
            inspector.setDrillingMode(selectDrillingMode.value);
        }

        // Zawsze używaj domyślnej orientacji PANEL_FLUSH pod poszycie płytami OSB/sklejką
        threeApp.setStrutAlignment('PANEL_FLUSH');

        const params = getParamsFromUI();
        currentDomeData = geoMath.calculateDome(params);

        threeApp.setDisplayMode(selectMode.value);
        threeApp.setShowNodeLabels(chkShowNodeLabels ? chkShowNodeLabels.checked : true);
        threeApp.setShowStrutLabels(chkShowStrutLabels ? chkShowStrutLabels.checked : true);
        threeApp.setLabelType(selectLabelType ? selectLabelType.value : 'CODE');
        
        if (inputLabelScale) {
            threeApp.setLabelScale(parseFloat(inputLabelScale.value) || 0.5);
        }

        threeApp.buildDome3D(currentDomeData);

        const firstPentagon = currentDomeData.vertices.find(v => v.type === 'PENTAGON') || currentDomeData.vertices[0];
        if (firstPentagon) {
            inspector.renderNode(firstPentagon, currentDomeData);
            threeApp.selectNodeById(firstPentagon.id);
        }

        renderStrutVariantTable(currentDomeData);
        renderNodeTypeTable(currentDomeData);
        renderAllNodeCards(currentDomeData);
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
                const sampleEdge = domeData.edges.find(e => e.variantCode === code || e.strutType === code);
                if (sampleEdge) {
                    inspector.renderStrut(sampleEdge, domeData);
                }
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

    function renderAllNodeCards(domeData) {
        const container = document.getElementById('all-node-cards-container');
        if (!container) return;

        const pipeOD = domeData.pipeODMm || 110;
        const circMm = Math.PI * pipeOD;

        let html = '';

        Object.values(domeData.summaryByNodeType).forEach(nt => {
            const sampleId = nt.nodeIds[0];
            const detail = domeData.nodeDetails[sampleId];
            if (!detail || !detail.struts) return;

            const baseAz = detail.struts[0].azimuthDeg;

            html += `
                <div class="workshop-node-card">
                    <div class="workshop-node-header">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span class="strut-tag" style="background-color: ${nt.color}; font-size: 13px; font-weight: bold; padding: 4px 10px;">${nt.code}</span>
                            <strong style="font-size: 13px; color: #fff;">${nt.description}</strong>
                        </div>
                        <div style="font-size: 12px; color: #ffd166; font-weight: bold;">
                            ${nt.count} szt.
                        </div>
                    </div>
                    <div style="display: flex; flex-wrap: wrap; gap: 12px; font-size: 11px; margin: 4px 0; color: #a0aec0;">
                        <span>Wypukłość (Pitch): <strong style="color: #fff;">${detail.pitchAngleDeg.toFixed(2)}°</strong></span>
                        <span>Rura Stal OD: <strong style="color: #fff;">${pipeOD} mm</strong></span>
                        <span>Obwód: <strong style="color: #00d1b2;">${circMm.toFixed(1)} mm</strong></span>
                        <span>Wzór: <strong style="color: #ffd166;">${nt.strutPattern}</strong></span>
                    </div>
                    <table class="workshop-table">
                        <thead>
                            <tr>
                                <th>Otwór</th>
                                <th>Belka</th>
                                <th>Azymut</th>
                                <th>Krok Δ</th>
                                <th style="color: #00d1b2;">Obwód (od 0.0)</th>
                                <th>Dł. cięcia</th>
                                <th>Zacięcia L/P</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            detail.struts.forEach((s, idx) => {
                const angleDeg = (s.azimuthDeg - baseAz + 360) % 360;
                const arcPosMm = (angleDeg / 360.0) * circMm;
                const miterStr = `${s.miterLeftDeg.toFixed(1)}°/${s.miterRightDeg.toFixed(1)}°`;

                html += `
                    <tr>
                        <td><strong style="color: #ffd166;">#${idx + 1}</strong></td>
                        <td><span class="strut-tag" style="background-color:${s.color}">#${s.edgeId + 1} ${s.strutType}</span></td>
                        <td>${angleDeg.toFixed(1)}°</td>
                        <td><strong>${idx === 0 ? '0.0°' : `+${s.deltaLeftDeg.toFixed(1)}°`}</strong></td>
                        <td style="color:#00d1b2; font-weight: bold;">${arcPosMm.toFixed(1)} mm</td>
                        <td><strong>${(s.cutLen * 1000).toFixed(0)} mm</strong></td>
                        <td style="color:#cbd5e0; font-size: 10px;">${miterStr}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        container.innerHTML = html;
    }

    function generatePrintReport(domeData) {
        const container = document.getElementById('print-workshop-report');
        if (!container || !domeData) return;

        const pipeOD = domeData.pipeODMm || 110;
        const circMm = Math.PI * pipeOD;
        const dateStr = new Date().toLocaleDateString('pl-PL', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });

        let totalNodes = 0;
        Object.values(domeData.summaryByNodeType).forEach(nt => totalNodes += nt.count);

        let totalStruts = 0;
        let totalMeterage = 0;
        Object.values(domeData.summaryByStrutVariant).forEach(v => {
            totalStruts += v.count;
            totalMeterage += parseFloat(v.totalMeterage);
        });

        let html = `
            <div class="print-report-header">
                <div>
                    <div class="print-report-title">📐 KOPUŁA GEODEZYJNA ${domeData.frequency}V – KARTY WARSZTATOWE</div>
                    <div style="font-size: 9pt; color: #555;">DOKUMENTACJA WYKONAWCZA: TRASOWANIE ŁĄCZNIKÓW ZE STALOWEJ RURY I ZESTAWIENIE CIĘĆ BELEK</div>
                </div>
                <div style="text-align: right; font-size: 8.5pt; color: #555;">
                    <div>Data wydruku: ${dateStr}</div>
                    <div>Geodesic Dome Builder</div>
                </div>
            </div>

            <div class="print-params-grid">
                <div><strong>Promień kopuły (R):</strong> ${domeData.radius} m</div>
                <div><strong>Rura stalowa OD:</strong> ${pipeOD} mm (Obwód: ${circMm.toFixed(1)} mm)</div>
                <div><strong>Przekrój drewna:</strong> ${domeData.timberWMm} x ${domeData.timberHMm} mm</div>
                <div><strong>Suma elementów:</strong> ${totalNodes} węzłów / ${totalStruts} belek (${totalMeterage.toFixed(1)} m)</div>
            </div>

            <div class="print-section-title">CZĘŚĆ 1: KARTY TRASOWANIA OTWORÓW W RURACH STALOWYCH (WĘZŁY W1 - W7)</div>
            <div style="font-size: 8pt; color: #444; margin-bottom: 8px;">
                Instrukcja trasowania: Otwory trasować taśmą mierniczą po zewnętrznym obwodzie rury stalowej ($C = ${circMm.toFixed(1)}\\text{ mm}$) od Otworu #1 ($0.0\\text{ mm}$) w kierunku przeciwnym do ruchu wskazówek zegara (CCW).
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
        `;

        Object.values(domeData.summaryByNodeType).forEach(nt => {
            const sampleId = nt.nodeIds[0];
            const detail = domeData.nodeDetails[sampleId];
            if (!detail || !detail.struts) return;

            const baseAz = detail.struts[0].azimuthDeg;

            html += `
                <div class="print-node-card">
                    <div class="print-node-card-header">
                        <div>WĘZEŁ ${nt.code} – ${nt.description}</div>
                        <div>ILOŚĆ: ${nt.count} SZT.</div>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-size: 8pt; margin-bottom: 4px; color: #333;">
                        <span>Wypukłość (Pitch): <strong>${detail.pitchAngleDeg.toFixed(2)}°</strong></span>
                        <span>Wzór belek: <strong>${nt.strutPattern}</strong></span>
                        <span>Ramiona: <strong>${nt.valency}</strong></span>
                    </div>
                    <table class="print-table">
                        <thead>
                            <tr>
                                <th>Otwór</th>
                                <th>Belka</th>
                                <th>Azymut</th>
                                <th>Krok Δ</th>
                                <th>Obwód (od 0.0 mm)</th>
                                <th>Dł. cięcia</th>
                                <th>Zacięcia L/P</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            detail.struts.forEach((s, idx) => {
                const angleDeg = (s.azimuthDeg - baseAz + 360) % 360;
                const arcPosMm = (angleDeg / 360.0) * circMm;
                const miterStr = `${s.miterLeftDeg.toFixed(1)}°/${s.miterRightDeg.toFixed(1)}°`;

                html += `
                    <tr>
                        <td><strong>#${idx + 1}</strong></td>
                        <td><strong>${s.strutType}</strong></td>
                        <td>${angleDeg.toFixed(1)}°</td>
                        <td>${idx === 0 ? '0.0°' : `+${s.deltaLeftDeg.toFixed(1)}°`}</td>
                        <td><strong>${arcPosMm.toFixed(1)} mm</strong></td>
                        <td>${(s.cutLen * 1000).toFixed(0)} mm</td>
                        <td style="font-size: 7.5pt;">${miterStr}</td>
                    </tr>
                `;
            });

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });

        html += `
            </div>

            <div class="page-break"></div>

            <div class="print-section-title" style="margin-top: 20px;">CZĘŚĆ 2: ZESTAWIENIE DOCIĘCIA BELEK DREWNIANYCH (WARIANTY A1 - F1)</div>
            <table class="print-table" style="margin-top: 8px;">
                <thead>
                    <tr>
                        <th>Wariant</th>
                        <th>Typ Główny</th>
                        <th>Dł. Osiowa (mm)</th>
                        <th>Dł. Docięcia (mm)</th>
                        <th>Zacięcie Lewe</th>
                        <th>Zacięcie Prawe</th>
                        <th>Ilość Sztuk</th>
                        <th>Suma Metrów</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.values(domeData.summaryByStrutVariant).forEach(v => {
            html += `
                <tr>
                    <td><strong>${v.variantCode}</strong></td>
                    <td>${v.baseType}</td>
                    <td>${v.centerLenMm} mm</td>
                    <td><strong>${v.cutLenMm} mm</strong></td>
                    <td>${v.miterLeftDeg.toFixed(1)}°</td>
                    <td>${v.miterRightDeg.toFixed(1)}°</td>
                    <td><strong>${v.count} szt.</strong></td>
                    <td>${v.totalMeterage} m</td>
                </tr>
            `;
        });

        html += `
                </tbody>
                <tfoot>
                    <tr style="font-weight: bold; background: #eee;">
                        <td colspan="6" style="text-align: right;">ŁĄCZNIE WSZYSTKIE BELKI:</td>
                        <td>${totalStruts} szt.</td>
                        <td>${totalMeterage.toFixed(2)} m</td>
                    </tr>
                </tfoot>
            </table>
        `;

        container.innerHTML = html;
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

    // Obsługa zakładek w dolnej sekcji (Zestawienie vs Karty Trasowania Węzłów)
    const bottomTabSummary = document.getElementById('bottom-tab-summary');
    const bottomTabNodeCards = document.getElementById('bottom-tab-node-cards');
    const bottomViewSummary = document.getElementById('bottom-view-summary');
    const bottomViewNodeCards = document.getElementById('bottom-view-node-cards');

    if (bottomTabSummary && bottomTabNodeCards) {
        bottomTabSummary.addEventListener('click', () => {
            bottomViewSummary.style.display = 'grid';
            bottomViewNodeCards.style.display = 'none';
            bottomTabSummary.style.background = 'rgba(0,209,178,0.2)';
            bottomTabSummary.style.borderColor = 'var(--primary)';
            bottomTabSummary.style.color = '#ffffff';
            bottomTabNodeCards.style.background = '#10161f';
            bottomTabNodeCards.style.borderColor = 'var(--panel-border)';
            bottomTabNodeCards.style.color = 'var(--text-muted)';
        });

        bottomTabNodeCards.addEventListener('click', () => {
            bottomViewSummary.style.display = 'none';
            bottomViewNodeCards.style.display = 'flex';
            bottomTabNodeCards.style.background = 'rgba(0,209,178,0.2)';
            bottomTabNodeCards.style.borderColor = 'var(--primary)';
            bottomTabNodeCards.style.color = '#ffffff';
            bottomTabSummary.style.background = '#10161f';
            bottomTabSummary.style.borderColor = 'var(--panel-border)';
            bottomTabSummary.style.color = 'var(--text-muted)';
        });
    }

    const handlePrint = () => {
        if (currentDomeData) {
            generatePrintReport(currentDomeData);
        }
        window.print();
    };

    btnRecalculate.addEventListener('click', updateApp);
    selectMode.addEventListener('change', () => {
        threeApp.setDisplayMode(selectMode.value);
    });

    if (selectFrequency) selectFrequency.addEventListener('change', updateApp);

    if (selectDrillingMode) {
        selectDrillingMode.addEventListener('change', () => {
            inspector.setDrillingMode(selectDrillingMode.value);
        });
    }

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

    const chkMiterCuts = document.getElementById('chk-miter-cuts');
    if (chkMiterCuts) {
        chkMiterCuts.addEventListener('change', () => {
            threeApp.setMiterCuts(chkMiterCuts.checked);
        });
    }

    if (inputLabelScale) {
        inputLabelScale.addEventListener('input', () => {
            threeApp.setLabelScale(parseFloat(inputLabelScale.value) || 0.5);
        });
    }

    if (selectLabelType) {
        selectLabelType.addEventListener('change', () => {
            threeApp.setLabelType(selectLabelType.value);
        });
    }

    [inputRadius, inputPipeOD, inputTimberW, inputTimberH, selectTrunc].forEach(input => {
        input.addEventListener('change', updateApp);
    });

    if (btnExportCSV) btnExportCSV.addEventListener('click', exportToCSV);
    if (btnPrint) btnPrint.addEventListener('click', handlePrint);

    const btnPrintWorkshop = document.getElementById('btn-print-workshop');
    if (btnPrintWorkshop) btnPrintWorkshop.addEventListener('click', handlePrint);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js?v=20260901_v5').then(() => {
            console.log('Service Worker zarejestrowany pomyślnie.');
        }).catch(err => {
            console.log('Błąd rejestracji Service Workera:', err);
        });
    }

    updateApp();
});
