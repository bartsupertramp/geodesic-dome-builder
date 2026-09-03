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
                        <th style="width: 48px;">Kod</th>
                        <th>Opis Rodzaju Węzła</th>
                        <th style="color: #00d1b2;">Kąty Otworów (Krok Δ)</th>
                        <th>Układ Belek</th>
                        <th style="width: 70px;">Sztuk</th>
                    </tr>
                </thead>
                <tbody>
        `;

        Object.values(domeData.summaryByNodeType).forEach(nt => {
            totalNodes += nt.count;

            const sampleId = nt.nodeIds[0];
            const detail = domeData.nodeDetails[sampleId];
            let angleSummary = '';
            if (detail && detail.struts) {
                const angles = detail.struts.map(s => s.deltaLeftDeg.toFixed(1) + '°');
                const isUniform = angles.every(a => a === angles[0]);
                if (isUniform) {
                    angleSummary = `<span style="color: #00d1b2; font-weight: bold; font-size: 11px;">${angles.length}× ${angles[0]}</span>`;
                } else {
                    angleSummary = `<span style="font-size: 10.5px; color: #ffd166; font-weight: 600;">${angles.join(' • ')}</span>`;
                }
            }

            html += `
                <tr class="node-type-row" data-code="${nt.code}" style="cursor:pointer;" title="Kliknij, aby podświetlić węzły ${nt.code} na modelu 3D">
                    <td><span class="strut-tag" style="background-color:${nt.color}">${nt.code}</span></td>
                    <td><strong>${nt.description}</strong></td>
                    <td>${angleSummary}</td>
                    <td><code>${nt.strutPattern}</code></td>
                    <td><strong style="color:#00d1b2; font-size:13px;">${nt.count} szt.</strong></td>
                </tr>
            `;
        });

        html += `
                </tbody>
                <tfoot>
                    <tr class="table-total">
                        <td colspan="4"><strong>SUMA WSZYSTKICH WĘZŁÓW:</strong></td>
                        <td><strong style="font-size:14px; color:#00d1b2;">${totalNodes} szt.</strong></td>
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

    function exportToPDF(domeData) {
        if (!domeData) return;
        if (!window.jspdf || !window.jspdf.jsPDF) {
            alert('Biblioteka PDF jest jeszcze ładowana. Spróbuj ponownie za chwilę.');
            return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });

        const pipeOD = domeData.pipeODMm || 110;
        const circMm = Math.PI * pipeOD;
        const dateStr = new Date().toLocaleDateString('pl-PL');

        let totalNodes = 0;
        Object.values(domeData.summaryByNodeType).forEach(nt => totalNodes += nt.count);

        let totalStruts = 0;
        let totalMeterage = 0;
        Object.values(domeData.summaryByStrutVariant).forEach(v => {
            totalStruts += v.count;
            totalMeterage += parseFloat(v.totalMeterage);
        });

        // 1. Tytuł i Nagłówek Dokumentu
        doc.setFillColor(16, 22, 31);
        doc.rect(0, 0, 210, 24, 'F');

        doc.setTextColor(0, 209, 178);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(`KOPULA GEODEZYJNA ${domeData.frequency}V - KARTY TRASOWANIA WEZLOW`, 14, 11);

        doc.setTextColor(200, 210, 220);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`Dokumentacja warsztatowa: Trasowanie otworow w rurze stalowej (OD ${pipeOD} mm) | Data: ${dateStr}`, 14, 18);

        // Parametry projektu w ramce
        doc.setFillColor(245, 247, 250);
        doc.setDrawColor(200, 210, 225);
        doc.roundedRect(14, 28, 182, 16, 2, 2, 'FD');

        doc.setTextColor(30, 40, 55);
        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'bold');
        doc.text(`Promien kopuly (R): ${domeData.radius} m`, 18, 34);
        doc.text(`Rura stalowa: OD ${pipeOD} mm (Obwod: ${circMm.toFixed(1)} mm)`, 75, 34);
        doc.text(`Przekroj drewna: ${domeData.timberWMm} x ${domeData.timberHMm} mm`, 145, 34);

        doc.setFont('helvetica', 'normal');
        doc.text(`Laczna liczba wezlow: ${totalNodes} szt.`, 18, 40);
        doc.text(`Laczna liczba belek: ${totalStruts} szt. (${totalMeterage.toFixed(1)} m)`, 75, 40);
        doc.text(`Czestotliwosc: ${domeData.frequency}V (4/8)`, 145, 40);

        let currentY = 48;

        // Sekcja 1: Karty trasowania węzłów W1 - W7
        doc.setTextColor(15, 25, 35);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('1. KARTY TRASOWANIA OTWOROW W PIERSCIENIACH ZE STALI (W1 - W7)', 14, currentY);
        currentY += 4;

        doc.setFontSize(7.5);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(90, 100, 115);
        doc.text(`Wymiary mierzone tasma traserska po obwodzie zewnetrznym rury (C = ${circMm.toFixed(1)} mm) od Otworu #1 (0.0 mm) w kierunku CCW.`, 14, currentY);
        currentY += 4;

        Object.values(domeData.summaryByNodeType).forEach((nt) => {
            const sampleId = nt.nodeIds[0];
            const detail = domeData.nodeDetails[sampleId];
            if (!detail || !detail.struts) return;

            const baseAz = detail.struts[0].azimuthDeg;

            // Sprawdź czy zmieści się na stronie
            if (currentY > 235) {
                doc.addPage();
                currentY = 16;
            }

            // Nagłówek węzła
            doc.setFillColor(235, 240, 245);
            doc.setDrawColor(180, 195, 210);
            doc.rect(14, currentY, 182, 6.5, 'FD');

            doc.setTextColor(20, 30, 45);
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.text(`WEZEL ${nt.code} - ${nt.description.toUpperCase()}  |  ILOSC: ${nt.count} SZT.`, 17, currentY + 4.5);

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8);
            doc.text(`Wypuklosc (Pitch): ${detail.pitchAngleDeg.toFixed(2)} deg  |  Uklad: ${nt.strutPattern}`, 115, currentY + 4.5);

            currentY += 6.5;

            // Tabela otworów
            const tableBody = detail.struts.map((s, idx) => {
                const angleDeg = (s.azimuthDeg - baseAz + 360) % 360;
                const arcPosMm = (angleDeg / 360.0) * circMm;
                const deltaStr = idx === 0 ? '0.0 deg' : `+${s.deltaLeftDeg.toFixed(1)} deg`;
                const miterStr = `${s.miterLeftDeg.toFixed(1)} / ${s.miterRightDeg.toFixed(1)} deg`;
                return [
                    `#${idx + 1}`,
                    `Belka ${s.strutType} (#${s.edgeId + 1})`,
                    `${angleDeg.toFixed(1)} deg`,
                    deltaStr,
                    `${arcPosMm.toFixed(1)} mm`,
                    `${(s.cutLen * 1000).toFixed(0)} mm`,
                    miterStr
                ];
            });

            doc.autoTable({
                startY: currentY,
                head: [['Otwor #', 'Belka', 'Azymut', 'Krok Delta', 'Wymiar na tasmie (od 0.0)', 'Dl. dociecia', 'Zaciecia L/P']],
                body: tableBody,
                theme: 'grid',
                styles: {
                    fontSize: 7.5,
                    cellPadding: 1.2,
                    halign: 'center',
                    textColor: [30, 40, 50],
                    lineColor: [200, 210, 220],
                    lineWidth: 0.15
                },
                headStyles: {
                    fillColor: [40, 50, 65],
                    textColor: [255, 255, 255],
                    fontStyle: 'bold',
                    fontSize: 7.5
                },
                columnStyles: {
                    4: { fontStyle: 'bold', textColor: [0, 130, 110] } // Wymiar na taśmie wyróżniony
                },
                margin: { left: 14, right: 14 }
            });

            currentY = doc.lastAutoTable.finalY + 6;
        });

        // Sekcja 2: Lista Cięć Belek Drewnianych
        doc.addPage();
        currentY = 16;

        doc.setTextColor(15, 25, 35);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.text('2. ZESTAWIENIE CIEC BELEK DREWNIANYCH (WARIANTY A1 - F1)', 14, currentY);
        currentY += 6;

        const strutTableBody = Object.values(domeData.summaryByStrutVariant).map(v => [
            v.variantCode,
            v.baseType,
            v.name,
            `${v.centerLenMm} mm`,
            `${v.cutLenMm} mm`,
            `${v.miterLeftDeg.toFixed(1)} deg`,
            `${v.miterRightDeg.toFixed(1)} deg`,
            `${v.count} szt.`,
            `${v.totalMeterage} m`
        ]);

        doc.autoTable({
            startY: currentY,
            head: [['Wariant', 'Typ', 'Nazwa', 'Dl. osiowa', 'Dl. dociecia', 'Zaciecie L', 'Zaciecie P', 'Ilosc', 'Metraz']],
            body: strutTableBody,
            theme: 'grid',
            styles: {
                fontSize: 8,
                cellPadding: 2,
                halign: 'center',
                textColor: [30, 40, 50],
                lineColor: [200, 210, 220],
                lineWidth: 0.2
            },
            headStyles: {
                fillColor: [40, 50, 65],
                textColor: [255, 255, 255],
                fontStyle: 'bold',
                fontSize: 8
            },
            foot: [['SUMA', '', '', '', '', '', '', `${totalStruts} szt.`, `${totalMeterage.toFixed(2)} m`]],
            footStyles: {
                fillColor: [230, 235, 245],
                textColor: [20, 30, 50],
                fontStyle: 'bold'
            },
            margin: { left: 14, right: 14 }
        });

        // Dodaj numerację stron na dole
        const pageCount = doc.internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setTextColor(130, 140, 150);
            doc.text(`Kopula Geodezyjna 4V (R=${domeData.radius}m, Rura OD ${pipeOD}mm)  |  Strona ${i} z ${pageCount}`, 105, 290, { align: 'center' });
        }

        // Zapis pliku PDF
        const fileName = `Karty_Trasowania_Wezlow_Kopula_${domeData.frequency}V_R${domeData.radius}m.pdf`;
        doc.save(fileName);
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

    // Obsługa zmiany wysokości dolnego panelu (Suwak + Przeciąganie myszą)
    const bottomDrawer = document.getElementById('bottom-drawer');
    const bottomDrawerResizer = document.getElementById('bottom-drawer-resizer');
    const sliderDrawerHeight = document.getElementById('slider-drawer-height');

    function setDrawerHeight(h) {
        const clampedH = Math.max(130, Math.min(window.innerHeight * 0.85, h));
        if (bottomDrawer) {
            bottomDrawer.style.height = `${clampedH}px`;
        }
        if (sliderDrawerHeight && parseInt(sliderDrawerHeight.value) !== Math.round(clampedH)) {
            sliderDrawerHeight.value = Math.round(clampedH);
        }
        if (threeApp && threeApp.onWindowResize) {
            threeApp.onWindowResize();
        }
    }

    if (sliderDrawerHeight) {
        sliderDrawerHeight.addEventListener('input', (e) => {
            setDrawerHeight(parseFloat(e.target.value));
        });
    }

    if (bottomDrawerResizer && bottomDrawer) {
        let isDragging = false;
        let startY = 0;
        let startH = 0;

        const onMouseDown = (e) => {
            isDragging = true;
            startY = e.clientY || (e.touches && e.touches[0].clientY);
            startH = bottomDrawer.getBoundingClientRect().height;
            bottomDrawerResizer.classList.add('dragging');
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'ns-resize';
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            window.addEventListener('touchmove', onMouseMove);
            window.addEventListener('touchend', onMouseUp);
        };

        const onMouseMove = (e) => {
            if (!isDragging) return;
            const clientY = e.clientY || (e.touches && e.touches[0].clientY);
            const deltaY = startY - clientY;
            setDrawerHeight(startH + deltaY);
        };

        const onMouseUp = () => {
            if (isDragging) {
                isDragging = false;
                bottomDrawerResizer.classList.remove('dragging');
                document.body.style.userSelect = '';
                document.body.style.cursor = '';
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
                window.removeEventListener('touchmove', onMouseMove);
                window.removeEventListener('touchend', onMouseUp);
            }
        };

        bottomDrawerResizer.addEventListener('mousedown', onMouseDown);
        bottomDrawerResizer.addEventListener('touchstart', onMouseDown, { passive: true });
    }

    const handleDownloadPDF = () => {
        if (currentDomeData) {
            exportToPDF(currentDomeData);
        }
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

    const btnExportPDF = document.getElementById('btn-export-pdf');
    if (btnExportPDF) btnExportPDF.addEventListener('click', handleDownloadPDF);

    const btnDownloadPdfNodes = document.getElementById('btn-download-pdf-nodes');
    if (btnDownloadPdfNodes) btnDownloadPdfNodes.addEventListener('click', handleDownloadPDF);

    const btnQuickPdf = document.getElementById('btn-quick-pdf');
    if (btnQuickPdf) btnQuickPdf.addEventListener('click', handleDownloadPDF);

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js?v=20260901_v5').then(() => {
            console.log('Service Worker zarejestrowany pomyślnie.');
        }).catch(err => {
            console.log('Błąd rejestracji Service Workera:', err);
        });
    }

    updateApp();
});
