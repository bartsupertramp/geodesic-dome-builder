/**
 * NodeInspector - Inspektor Węzła 2D i Tabele Warsztatowe dla Łączników ze Stalowej Rury
 * Prezentuje rzeczywiste kąty między otworami (3D) oraz wymiary trasowania po obwodzie rury.
 */

class NodeInspector {
    constructor(canvas2dId, detailContainerIdOrProfile, detailContainerId) {
        this.canvas2d = document.getElementById(canvas2dId);
        this.ctx2d = this.canvas2d ? this.canvas2d.getContext('2d') : null;
        const containerId = detailContainerId || detailContainerIdOrProfile;
        this.detailContainer = document.getElementById(containerId);
        this.drillingMode = 'SPHERICAL'; // 'SPHERICAL' (Precyzyjne 3D dla stali) lub 'UNIFORM'
    }

    setDrillingMode(mode) {
        this.drillingMode = mode;
        if (this.currentNodeData && this.currentFullDomeData) {
            this.renderNode(this.currentNodeData, this.currentFullDomeData);
        }
    }

    renderNode(nodeData, fullDomeData) {
        this.currentNodeData = nodeData;
        this.currentFullDomeData = fullDomeData;

        const detail = fullDomeData.nodeDetails[nodeData.id];
        if (!detail) return;

        this.draw2dHub(detail, fullDomeData);
        this.renderTable(detail, fullDomeData);
    }

    /**
     * Rysuje czytelny, precyzyjny schemat 2D łącznika ze stali:
     * - Rzeczywiste kąty między osiami otworów (Delta°) z modelu 3D na łukach wymiarowych
     * - Punkty wiercenia otworów (#1..#N) z czerwonym punktem osi
     * - Przypisane belki (A, B, C, D...) bez mylących oznaczeń zacięć stolarskich
     */
    draw2dHub(detail, fullDomeData) {
        if (!this.ctx2d) return;

        const ctx = this.ctx2d;
        const width = this.canvas2d.width;
        const height = this.canvas2d.height;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        // Ciemne tło techniczne
        ctx.fillStyle = '#10161f';
        ctx.fillRect(0, 0, width, height);

        const valency = detail.struts.length;
        if (valency === 0) return;

        const baseAzimuth = detail.struts[0].azimuthDeg;
        const pipeRadiusPx = Math.min(width, height) * 0.16;
        const beamLengthPx = Math.min(width, height) * 0.28;
        const timberW = Math.max(16, Math.min(width, height) * 0.055);
        const arcRadiusPx = pipeRadiusPx + 40;

        // Oblicz relatywne kąty dla każdego ramienia
        const arms = detail.struts.map((s, idx) => {
            let angleDeg = (s.azimuthDeg - baseAzimuth + 360) % 360;
            if (this.drillingMode === 'UNIFORM') {
                angleDeg = (idx / valency) * 360.0;
            }
            return {
                ...s,
                idx,
                angleDeg,
                rad: (angleDeg * Math.PI) / 180.0
            };
        });

        // 1. Rysowanie belek drewnianych dochodzących do węzła
        arms.forEach(arm => {
            const rad = arm.rad;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rad);

            // Korpus belki w jej kolorze
            ctx.fillStyle = arm.color || '#C19A6B';
            ctx.fillRect(pipeRadiusPx, -timberW / 2, beamLengthPx, timberW);

            // Obrys belki
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 1.2;
            ctx.strokeRect(pipeRadiusPx, -timberW / 2, beamLengthPx, timberW);

            // Etykieta belki z jej unikalnym numerem (np. "#1 (C)", "#2 (A)")
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // Unikaj odwróconych napisów na lewej półkuli
            const isFlipped = arm.angleDeg > 90 && arm.angleDeg < 270;
            if (isFlipped) {
                ctx.save();
                ctx.translate(pipeRadiusPx + beamLengthPx * 0.58, 0);
                ctx.rotate(Math.PI);
                ctx.fillText(`#${arm.edgeId + 1} (${arm.strutType})`, 0, 0);
                ctx.restore();
            } else {
                ctx.fillText(`#${arm.edgeId + 1} (${arm.strutType})`, pipeRadiusPx + beamLengthPx * 0.58, 0);
            }

            ctx.restore();
        });

        // 2. Łuki wymiarowe kątów między sąsiednimi belkami / otworami (Kąty Delta)
        for (let i = 0; i < valency; i++) {
            const curr = arms[i];
            const next = arms[(i + 1) % valency];
            
            let deltaDeg = (next.angleDeg - curr.angleDeg + 360) % 360;
            if (deltaDeg === 0) deltaDeg = 360;

            const startRad = curr.rad;
            const endRad = curr.rad + (deltaDeg * Math.PI / 180.0);
            const midRad = curr.rad + (deltaDeg * Math.PI / 360.0);

            // Rysuj przerywany łuk wymiarowy
            ctx.beginPath();
            ctx.arc(centerX, centerY, arcRadiusPx, startRad, endRad);
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([3, 3]);
            ctx.stroke();
            ctx.setLineDash([]);

            // Kropki graniczne łuku
            const d1X = centerX + arcRadiusPx * Math.cos(startRad);
            const d1Y = centerY + arcRadiusPx * Math.sin(startRad);
            const d2X = centerX + arcRadiusPx * Math.cos(endRad);
            const d2Y = centerY + arcRadiusPx * Math.sin(endRad);

            ctx.beginPath();
            ctx.arc(d1X, d1Y, 2.5, 0, Math.PI * 2);
            ctx.arc(d2X, d2Y, 2.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ffd166';
            ctx.fill();

            // Plakietka z kątem (np. 54.9°, 60.7°, 64.5°)
            const textX = centerX + arcRadiusPx * Math.cos(midRad);
            const textY = centerY + arcRadiusPx * Math.sin(midRad);
            const angleText = `${deltaDeg.toFixed(1)}°`;

            ctx.font = 'bold 11px monospace';
            const metrics = ctx.measureText(angleText);
            const bW = metrics.width + 10;
            const bH = 18;

            ctx.fillStyle = '#0f141c';
            ctx.beginPath();
            if (ctx.roundRect) {
                ctx.roundRect(textX - bW / 2, textY - bH / 2, bW, bH, 4);
            } else {
                ctx.rect(textX - bW / 2, textY - bH / 2, bW, bH);
            }
            ctx.fill();
            ctx.strokeStyle = '#ffd166';
            ctx.lineWidth = 1;
            ctx.stroke();

            ctx.fillStyle = '#ffd166';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(angleText, textX, textY);
        }

        // 3. Pierścień Rury Stalowej
        // Ścianka zewnętrzna
        ctx.beginPath();
        ctx.arc(centerX, centerY, pipeRadiusPx, 0, Math.PI * 2);
        ctx.fillStyle = '#1e2632';
        ctx.fill();
        ctx.lineWidth = 4;
        ctx.strokeStyle = '#00d1b2';
        ctx.stroke();

        // Światło wewnętrzne rury stalowej
        ctx.beginPath();
        ctx.arc(centerX, centerY, pipeRadiusPx * 0.62, 0, Math.PI * 2);
        ctx.fillStyle = '#0a0e14';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = '#2d3748';
        ctx.stroke();

        // 4. Punkty Otworów na Rurze Stalowej i Numery Otworów
        arms.forEach((arm, i) => {
            const rad = arm.rad;
            const holeDist = pipeRadiusPx * 0.84;
            const holeX = centerX + holeDist * Math.cos(rad);
            const holeY = centerY + holeDist * Math.sin(rad);

            // Srebrny łeb śruby / podkładka
            ctx.beginPath();
            ctx.arc(holeX, holeY, 4.5, 0, Math.PI * 2);
            ctx.fillStyle = '#e2e8f0';
            ctx.fill();
            ctx.strokeStyle = '#000000';
            ctx.lineWidth = 1.2;
            ctx.stroke();

            // Czerwony centralny punkt wiercenia (oś belki)
            ctx.beginPath();
            ctx.arc(holeX, holeY, 1.5, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4136';
            ctx.fill();

            // Numer otworu (#1, #2...) wewnątrz pierścienia
            const numDist = pipeRadiusPx * 0.42;
            const numX = centerX + numDist * Math.cos(rad);
            const numY = centerY + numDist * Math.sin(rad);

            ctx.fillStyle = '#a0aec0';
            ctx.font = 'bold 9px monospace';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(`#${i + 1}`, numX, numY);
        });

        // 5. Centralna Etykieta Węzła (np. "W2")
        ctx.fillStyle = '#00d1b2';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(detail.nodeTypeCode || detail.type, centerX, centerY - 6);

        ctx.fillStyle = '#718096';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText(`${valency} ramion`, centerX, centerY + 11);
    }

    renderTable(detail, fullDomeData) {
        if (!this.detailContainer) return;

        const pipeOD = fullDomeData.pipeODMm || 110;
        const circumferenceMm = Math.PI * pipeOD;
        const baseAzimuth = detail.struts[0] ? detail.struts[0].azimuthDeg : 0;
        const valency = detail.struts.length;

        let html = `
            <div class="node-summary-card">
                <div class="node-badge node-${detail.type.toLowerCase()}">
                    WĘZEŁ #${detail.nodeId + 1} (${detail.nodeTypeCode || detail.type})
                </div>
                <div class="node-stats">
                    <div><span>Wypukłość:</span> <strong>${detail.pitchAngleDeg.toFixed(2)}°</strong></div>
                    <div><span>Rura Stal OD:</span> <strong>${pipeOD} mm</strong></div>
                    <div><span>Ramiona:</span> <strong>${detail.struts.length} szt.</strong></div>
                    <div><span>Obwód rury:</span> <strong>${circumferenceMm.toFixed(1)} mm</strong></div>
                </div>
            </div>

            <div class="table-responsive">
                <table class="node-inspector-table">
                    <thead>
                        <tr>
                            <th title="Numer otworu w rurze">Otwór</th>
                            <th title="Numer i typ belki">Belka</th>
                            <th title="Rozstęp kątowy do poprzedniego otworu">Kąt Δ</th>
                            <th title="Wymiar po obwodzie rury od Otworu #1">Obwód (od 0)</th>
                            <th title="Długość docięcia belki drewnianej">Dł. cięcia</th>
                            <th title="Kąty zacięcia stolarskiego">Zacięcia L/P</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        detail.struts.forEach((s, idx) => {
            let angleDeg = (s.azimuthDeg - baseAzimuth + 360) % 360;
            let deltaDeg = s.deltaLeftDeg;
            if (this.drillingMode === 'UNIFORM') {
                angleDeg = (idx / valency) * 360.0;
                deltaDeg = 360.0 / valency;
            }

            const arcPosMm = (angleDeg / 360.0) * circumferenceMm;
            const miterStr = `${s.miterLeftDeg.toFixed(1)}°/${s.miterRightDeg.toFixed(1)}°`;

            html += `
                <tr>
                    <td><strong style="color: #ffd166;">#${idx + 1}</strong></td>
                    <td><span class="strut-tag" style="background-color:${s.color}">#${s.edgeId + 1} ${s.strutType}</span></td>
                    <td><strong>${idx === 0 ? '0.0°' : `+${deltaDeg.toFixed(1)}°`}</strong></td>
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

        this.detailContainer.innerHTML = html;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeInspector;
} else {
    window.NodeInspector = NodeInspector;
}
