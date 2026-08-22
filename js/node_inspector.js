/**
 * NodeInspector - Interaktywny inspektor węzła rurowego 2D i generator kątów cięć stolarskich.
 */

class NodeInspector {
    constructor(canvas2dId, profileCanvasId, detailContainerId) {
        this.canvas2d = document.getElementById(canvas2dId);
        this.ctx2d = this.canvas2d ? this.canvas2d.getContext('2d') : null;
        
        this.profileCanvas = document.getElementById(profileCanvasId);
        this.ctxProfile = this.profileCanvas ? this.profileCanvas.getContext('2d') : null;

        this.detailContainer = document.getElementById(detailContainerId);
    }

    /**
     * Główna funkcja rysująca dane wybranego węzła
     * @param {Object} nodeData - Dane z GeodesicMath (wierzchołek)
     * @param {Object} fullDomeData - Pełny wynik kalkulatora
     */
    renderNode(nodeData, fullDomeData) {
        const detail = fullDomeData.nodeDetails[nodeData.id];
        if (!detail) return;

        this.currentDetail = detail;
        this.fullDomeData = fullDomeData;

        this.draw2dHub(detail, fullDomeData);
        this.drawProfile(detail);
        this.renderTable(detail, fullDomeData);
    }

    /**
     * Rysuje widok od góry pierścienia rury PVC ze śrubami i dojeżdżającymi belkami
     */
    draw2dHub(detail, fullDomeData) {
        if (!this.ctx2d) return;

        const ctx = this.ctx2d;
        const width = this.canvas2d.width;
        const height = this.canvas2d.height;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        // Tło Canvas
        ctx.fillStyle = '#1a222d';
        ctx.fillRect(0, 0, width, height);

        const pipeRadiusPx = Math.min(width, height) * 0.18;
        const strutLengthPx = Math.min(width, height) * 0.32;
        const timberW = Math.max(12, Math.min(width, height) * 0.06);

        // 1. Rysuj Dojeżdżające Belki Drewniane
        detail.struts.forEach(strut => {
            const rad = (strut.azimuthDeg * Math.PI) / 180;
            const cos = Math.cos(rad);
            const sin = Math.sin(rad);

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rad);

            // Rysuj belkę wychodzącą od krawędzi rury
            const startX = pipeRadiusPx;
            const endX = pipeRadiusPx + strutLengthPx;

            // Drewniana belka
            ctx.fillStyle = strut.color || '#C19A6B';
            ctx.fillRect(startX, -timberW / 2, strutLengthPx, timberW);

            // Obrys belki
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(startX, -timberW / 2, strutLengthPx, timberW);

            // Zacięcie z lewej i prawej strony (Miter angles)
            ctx.fillStyle = '#00ffff';
            ctx.font = '10px monospace';
            ctx.fillText(`L:${strut.miterLeftDeg.toFixed(1)}°`, startX + 10, -timberW / 2 - 4);
            ctx.fillText(`P:${strut.miterRightDeg.toFixed(1)}°`, startX + 10, timberW / 2 + 12);

            // Etykieta typu belki A-F
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(strut.strutType, startX + strutLengthPx / 2, 4);

            ctx.restore();
        });

        // 2. Rysuj Rurę PVC (Zewnętrzny i Wewnętrzny Pierścień)
        ctx.beginPath();
        ctx.arc(centerX, centerY, pipeRadiusPx, 0, Math.PI * 2);
        ctx.fillStyle = '#2a3441';
        ctx.fill();
        ctx.lineWidth = 6;
        ctx.strokeStyle = '#00d1b2'; // Turkusowy pierścień łącznika
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, pipeRadiusPx * 0.75, 0, Math.PI * 2);
        ctx.fillStyle = '#121820'; // Wnętrze rury
        ctx.fill();

        // 3. Rysuj Śruby Łączące Rurę z Belkami (Widoczne od Środka Rury)
        detail.struts.forEach(strut => {
            const rad = (strut.azimuthDeg * Math.PI) / 180;
            const boltX = centerX + (pipeRadiusPx * 0.86) * Math.cos(rad);
            const boltY = centerY + (pipeRadiusPx * 0.86) * Math.sin(rad);

            ctx.beginPath();
            ctx.arc(boltX, boltY, 4, 0, Math.PI * 2);
            ctx.fillStyle = '#e2e8f0';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Etykieta Środkowa
        ctx.fillStyle = '#00d1b2';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(detail.type, centerX, centerY);
    }

    /**
     * Rysuje profil boczny wygięcia/wypukłości węzła (Pitch angle gauge)
     */
    drawProfile(detail) {
        if (!this.ctxProfile) return;

        const ctx = this.ctxProfile;
        const width = this.profileCanvas.width;
        const height = this.profileCanvas.height;
        const centerX = width / 2;
        const centerY = height * 0.75;

        ctx.clearRect(0, 0, width, height);

        // Tło
        ctx.fillStyle = '#1a222d';
        ctx.fillRect(0, 0, width, height);

        // Płaska linia odniesienia (0 deg)
        ctx.strokeStyle = '#4a5568';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(20, centerY);
        ctx.lineTo(width - 20, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Rysuj wygięty profil wierzchołka
        const pitchRad = (detail.pitchAngleDeg * Math.PI) / 180;
        const armLen = width * 0.35;

        const leftX = centerX - armLen * Math.cos(pitchRad);
        const leftY = centerY - armLen * Math.sin(pitchRad);

        const rightX = centerX + armLen * Math.cos(pitchRad);
        const rightY = centerY - armLen * Math.sin(pitchRad);

        // Lewe i prawe ramię wypukłości
        ctx.strokeStyle = detail.type === 'PENTAGON' ? '#ff3860' : '#3273dc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(leftX, leftY);
        ctx.lineTo(centerX, centerY - 15);
        ctx.lineTo(rightX, rightY);
        ctx.stroke();

        // Rura PVC w profilu
        ctx.fillStyle = '#2a3441';
        ctx.fillRect(centerX - 15, centerY - 25, 30, 20);
        ctx.strokeStyle = '#00d1b2';
        ctx.strokeRect(centerX - 15, centerY - 25, 30, 20);

        // Tekst kątowy wypukłości
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Wypukłość (Kąt Odchylenia): ${detail.pitchAngleDeg.toFixed(2)}°`, centerX, 20);
        
        ctx.fillStyle = '#a0aec0';
        ctx.font = '11px sans-serif';
        ctx.fillText(
            detail.type === 'PENTAGON' 
                ? 'Węzeł Pentagonu: Wysoka wypukłość (~10.8° tilt)' 
                : 'Węzeł Heksagonu: Niższa wypukłość (~5.4° tilt)',
            centerX, 38
        );
    }

    /**
     * Generuje tabelę szczegółów zacięć dla wybranego węzła
     */
    renderTable(detail, fullDomeData) {
        if (!this.detailContainer) return;

        let html = `
            <div class="node-summary-card">
                <div class="node-badge node-${detail.type.toLowerCase()}">
                    WĘZEŁ ${detail.nodeId} (${detail.type})
                </div>
                <div class="node-stats">
                    <div><span>Wypukłość:</span> <strong>${detail.pitchAngleDeg.toFixed(2)}°</strong></div>
                    <div><span>Średnica Rury PVC:</span> <strong>${fullDomeData.pipeODMm} mm</strong></div>
                    <div><span>Liczba Ramion:</span> <strong>${detail.struts.length}</strong></div>
                </div>
            </div>
            
            <table class="cut-table">
                <thead>
                    <tr>
                        <th>Belka</th>
                        <th>Dł. Środek</th>
                        <th>Dł. Cięcia</th>
                        <th>Zacięcie L</th>
                        <th>Zacięcie P</th>
                    </tr>
                </thead>
                <tbody>
        `;

        detail.struts.forEach(s => {
            html += `
                <tr>
                    <td><span class="strut-tag" style="background-color:${s.color}">${s.strutType}</span></td>
                    <td>${(s.centerLen * 1000).toFixed(0)} mm</td>
                    <td><strong>${(s.cutLen * 1000).toFixed(0)} mm</strong></td>
                    <td>${s.miterLeftDeg.toFixed(1)}°</td>
                    <td>${s.miterRightDeg.toFixed(1)}°</td>
                </tr>
            `;
        });

        html += `
                </tbody>
            </table>
        `;

        this.detailContainer.innerHTML = html;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeInspector;
} else {
    window.NodeInspector = NodeInspector;
}
