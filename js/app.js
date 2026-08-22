/**
 * App - Główny kontroler aplikacji Geodesic Dome Builder
 * z obsługą częstotliwości 1V-4V, wariantów A1..F1, węzłów W1..W7
 * oraz rejestracją Service Workera pod PWA / Google Play.
 */

document.addEventListener('DOMContentLoaded', () => {
    const geoMath = new GeodesicMath();
    
    const inspector = new NodeInspector('canvas-2d', 'canvas-profile', 'node-detail-content');

    const threeApp = new ThreeApp('canvas-3d-container', {
        onNodeSelect: (nodeData) => {
            if (currentDomeData) {
                inspector.renderNode(nodeData, currentDomeData);
            }
        },
        onStrutSelect: (edgeData) => {
            const v1Node = currentDomeData.vertices[edgeData.v1];
            inspector.renderNode(v1Node, currentDomeData);
            threeApp.highlightStrutVariant(edgeData.variantCode);
        }
    });

    let currentDomeData = null;

    const inputRadius = document.getElementById('input-radius');
    const inputPipeOD = document.getElementById('input-pipe-od');
    const inputTimberW = document.getElementById('input-timber-w');
    const inputTimberH = document.getElementById('input-timber-h');
    
    const selectFrequency = document.getElementById('select-frequency');
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
            });
        });
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

    btnRecalculate.addEventListener('click', updateApp);
    selectMode.addEventListener('change', () => {
        threeApp.setDisplayMode(selectMode.value);
    });

    if (selectFrequency) selectFrequency.addEventListener('change', updateApp);

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

    if (selectLabelType) {
        selectLabelType.addEventListener('change', () => {
            threeApp.setLabelType(selectLabelType.value);
        });
    }

    [inputRadius, inputPipeOD, inputTimberW, inputTimberH, selectTrunc].forEach(input => {
        input.addEventListener('change', updateApp);
    });

    if (btnExportCSV) btnExportCSV.addEventListener('click', exportToCSV);
    if (btnPrint) btnPrint.addEventListener('click', () => window.print());

    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js').then(() => {
            console.log('Service Worker zarejestrowany pomyślnie pod PWA / Google Play.');
        }).catch(err => {
            console.log('Błąd rejestracji Service Workera:', err);
        });
    }

    updateApp();
});
