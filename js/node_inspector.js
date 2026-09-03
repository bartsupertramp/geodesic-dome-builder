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

        this.activeTab = 'node';
        this.initTabs();
    }

    initTabs() {
        this.nodeView = document.getElementById('inspector-node-view');
        this.strutView = document.getElementById('inspector-strut-view');
        this.tabBtnNode = document.getElementById('tab-btn-node');
        this.tabBtnStrut = document.getElementById('tab-btn-strut');
        this.canvasStrut2d = document.getElementById('canvas-strut-2d');
        this.ctxStrut2d = this.canvasStrut2d ? this.canvasStrut2d.getContext('2d') : null;
        this.strutDetailContainer = document.getElementById('strut-detail-content');

        if (this.tabBtnNode) {
            this.tabBtnNode.addEventListener('click', () => this.setTab('node'));
        }
        if (this.tabBtnStrut) {
            this.tabBtnStrut.addEventListener('click', () => this.setTab('strut'));
        }
    }

    setTab(tabName) {
        this.activeTab = tabName;
        if (!this.nodeView) this.nodeView = document.getElementById('inspector-node-view');
        if (!this.strutView) this.strutView = document.getElementById('inspector-strut-view');
        if (!this.tabBtnNode) this.tabBtnNode = document.getElementById('tab-btn-node');
        if (!this.tabBtnStrut) this.tabBtnStrut = document.getElementById('tab-btn-strut');

        if (tabName === 'node') {
            if (this.nodeView) this.nodeView.style.display = 'flex';
            if (this.strutView) this.strutView.style.display = 'none';
            if (this.tabBtnNode) {
                this.tabBtnNode.style.background = 'rgba(0,209,178,0.2)';
                this.tabBtnNode.style.borderColor = 'var(--primary)';
                this.tabBtnNode.style.color = '#ffffff';
            }
            if (this.tabBtnStrut) {
                this.tabBtnStrut.style.background = '#10161f';
                this.tabBtnStrut.style.borderColor = 'var(--panel-border)';
                this.tabBtnStrut.style.color = 'var(--text-muted)';
            }
        } else if (tabName === 'strut') {
            if (this.nodeView) this.nodeView.style.display = 'none';
            if (this.strutView) this.strutView.style.display = 'flex';
            if (this.tabBtnStrut) {
                this.tabBtnStrut.style.background = 'rgba(0,209,178,0.2)';
                this.tabBtnStrut.style.borderColor = 'var(--primary)';
                this.tabBtnStrut.style.color = '#ffffff';
            }
            if (this.tabBtnNode) {
                this.tabBtnNode.style.background = '#10161f';
                this.tabBtnNode.style.borderColor = 'var(--panel-border)';
                this.tabBtnNode.style.color = 'var(--text-muted)';
            }
        }
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

        this.setTab('node');

        const detail = fullDomeData.nodeDetails[nodeData.id];
        if (!detail) return;

        this.draw2dHub(detail, fullDomeData);
        this.renderTable(detail, fullDomeData);
    }

    renderStrut(edgeData, fullDomeData) {
        this.currentEdgeData = edgeData;
        this.currentFullDomeData = fullDomeData;

        this.setTab('strut');
        this.drawStrutCutProfile(edgeData, fullDomeData);
        this.renderStrutCard(edgeData, fullDomeData);
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

    /**
     * Rysuje profil techniczny docięcia pojedynczej belki (Widok Boczny z Kątami Wypukłości Czaszy)
     */
    drawStrutCutProfile(edge, fullDomeData) {
        if (!this.ctxStrut2d) {
            this.canvasStrut2d = document.getElementById('canvas-strut-2d');
            this.ctxStrut2d = this.canvasStrut2d ? this.canvasStrut2d.getContext('2d') : null;
        }
        if (!this.ctxStrut2d) return;

        const ctx = this.ctxStrut2d;
        const width = this.canvasStrut2d.width;
        const height = this.canvasStrut2d.height;

        ctx.clearRect(0, 0, width, height);

        // Ciemne tło
        ctx.fillStyle = '#10161f';
        ctx.fillRect(0, 0, width, height);

        const v1 = fullDomeData.vertices[edge.v1];
        const v2 = fullDomeData.vertices[edge.v2];
        const pitch1 = v1 ? v1.pitchAngleDeg : 7.27;
        const pitch2 = v2 ? v2.pitchAngleDeg : 7.27;

        const timberH = (fullDomeData.timberHMm || 45);
        const cutLenMm = (edge.cutLen * 1000);
        const centerLenMm = (edge.centerLen * 1000);

        const bevel1Mm = (timberH / 2) * Math.tan((pitch1 * Math.PI) / 180);
        const bevel2Mm = (timberH / 2) * Math.tan((pitch2 * Math.PI) / 180);
        const topLenMm = cutLenMm + bevel1Mm + bevel2Mm;
        const bottomLenMm = cutLenMm - bevel1Mm - bevel2Mm;

        // Rysowanie profilu bocznego belki w proporcjach
        const beamW = width * 0.65;
        const beamH = 42;
        const startX = (width - beamW) / 2;
        const centerY = height * 0.50;

        const topY = centerY - beamH / 2;
        const botY = centerY + beamH / 2;

        // Przelicz ścięcia w pikselach
        const bevPx1 = Math.max(8, beamH * Math.tan((pitch1 * Math.PI) / 180));
        const bevPx2 = Math.max(8, beamH * Math.tan((pitch2 * Math.PI) / 180));

        const p_TL = [startX - bevPx1 / 2, topY];
        const p_BL = [startX + bevPx1 / 2, botY];
        const p_TR = [startX + beamW + bevPx2 / 2, topY];
        const p_BR = [startX + beamW - bevPx2 / 2, botY];

        // Ciało belki (drewno)
        ctx.beginPath();
        ctx.moveTo(p_TL[0], p_TL[1]);
        ctx.lineTo(p_TR[0], p_TR[1]);
        ctx.lineTo(p_BR[0], p_BR[1]);
        ctx.lineTo(p_BL[0], p_BL[1]);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, topY, 0, botY);
        grad.addColorStop(0, edge.color || '#C19A6B');
        grad.addColorStop(1, '#8B5A2B');
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.6;
        ctx.stroke();

        // Oś środkowa (przerywana linia trasowania)
        ctx.beginPath();
        ctx.setLineDash([4, 4]);
        ctx.moveTo(startX - 22, centerY);
        ctx.lineTo(startX + beamW + 22, centerY);
        ctx.strokeStyle = 'rgba(255,255,255,0.45)';
        ctx.stroke();
        ctx.setLineDash([]);

        // Otwory montażowe pod śruby w osi belki
        const hole1X = startX + 26;
        const hole2X = startX + beamW - 26;
        [hole1X, hole2X].forEach(hx => {
            ctx.beginPath();
            ctx.arc(hx, centerY, 5.5, 0, Math.PI * 2);
            ctx.fillStyle = '#10161f';
            ctx.fill();
            ctx.strokeStyle = '#00d1b2';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(hx, centerY, 1.8, 0, Math.PI * 2);
            ctx.fillStyle = '#ff4136';
            ctx.fill();
        });

        // Wymiar górny (pod poszycie)
        ctx.fillStyle = '#00d1b2';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`▲ GÓRA (Pod Poszycie): ${topLenMm.toFixed(1)} mm`, width / 2, topY - 14);

        // Wymiar środkowy (oś docięcia)
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.fillText(`OŚ DOCIĘCIA: ${cutLenMm.toFixed(1)} mm`, width / 2, centerY + 4);

        // Wymiar dolny (wnętrze kopuły)
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 11px sans-serif';
        ctx.fillText(`▼ DÓŁ (Wnętrze Kopuły): ${bottomLenMm.toFixed(1)} mm`, width / 2, botY + 22);

        // Etykiety i kąty ścięcia na końcach
        // Koniec 1 (Lewy)
        ctx.fillStyle = '#a0aec0';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(`Koniec 1 ➔ Węzeł #${edge.v1 + 1} (${v1 ? v1.nodeTypeCode : 'W'})`, 10, 18);
        ctx.fillStyle = '#ff3860';
        ctx.fillText(`Kąt ścięcia: ${pitch1.toFixed(2)}°`, 10, 32);

        // Koniec 2 (Prawy)
        ctx.fillStyle = '#a0aec0';
        ctx.textAlign = 'right';
        ctx.fillText(`Koniec 2 ➔ Węzeł #${edge.v2 + 1} (${v2 ? v2.nodeTypeCode : 'W'})`, width - 10, 18);
        ctx.fillStyle = '#ff3860';
        ctx.fillText(`Kąt ścięcia: ${pitch2.toFixed(2)}°`, width - 10, 32);

        // Kąty zacięć ukośnicy na dole rysunku
        ctx.fillStyle = '#a0aec0';
        ctx.textAlign = 'center';
        ctx.font = '10px sans-serif';
        ctx.fillText(`Zacięcia ciesielskie pod ukośnicę: Lewe ${edge.miterLeftDeg.toFixed(1)}° / Prawe ${edge.miterRightDeg.toFixed(1)}°`, width / 2, height - 10);
    }

    /**
     * Karta szczegółowych parametrów wybranej belki
     */
    renderStrutCard(edge, fullDomeData) {
        if (!this.strutDetailContainer) {
            this.strutDetailContainer = document.getElementById('strut-detail-content');
        }
        if (!this.strutDetailContainer) return;

        const v1 = fullDomeData.vertices[edge.v1];
        const v2 = fullDomeData.vertices[edge.v2];
        const pitch1 = v1 ? v1.pitchAngleDeg : 7.27;
        const pitch2 = v2 ? v2.pitchAngleDeg : 7.27;

        const timberH = (fullDomeData.timberHMm || 45);
        const timberW = (fullDomeData.timberWMm || 45);
        const cutLenMm = (edge.cutLen * 1000);
        const centerLenMm = (edge.centerLen * 1000);

        const bevel1Mm = (timberH / 2) * Math.tan((pitch1 * Math.PI) / 180);
        const bevel2Mm = (timberH / 2) * Math.tan((pitch2 * Math.PI) / 180);
        const topLenMm = cutLenMm + bevel1Mm + bevel2Mm;
        const bottomLenMm = cutLenMm - bevel1Mm - bevel2Mm;

        let html = `
            <div class="node-summary-card">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <span class="strut-tag" style="background-color: ${edge.color || '#FF4136'}; font-size: 13px; padding: 4px 10px;">
                        BELKA #${edge.id + 1} (${edge.variantCode || edge.strutType})
                    </span>
                    <span style="font-size: 11px; color: var(--text-muted);">Typ Geometrii: ${edge.strutType}</span>
                </div>
                <div class="node-stats">
                    <div><span>Węzeł 1:</span> <strong style="color:#00d1b2;">#${edge.v1 + 1} (${v1 ? v1.nodeTypeCode : 'W'})</strong></div>
                    <div><span>Węzeł 2:</span> <strong style="color:#00d1b2;">#${edge.v2 + 1} (${v2 ? v2.nodeTypeCode : 'W'})</strong></div>
                    <div><span>Długość Osiowa:</span> <strong>${centerLenMm.toFixed(1)} mm</strong></div>
                    <div><span>Dł. Docięcia (Oś):</span> <strong style="color:#00d1b2; font-size: 13px;">${cutLenMm.toFixed(1)} mm</strong></div>
                    <div><span>Dł. Góra (Poszycie):</span> <strong>${topLenMm.toFixed(1)} mm</strong></div>
                    <div><span>Dł. Dół (Wnętrze):</span> <strong>${bottomLenMm.toFixed(1)} mm</strong></div>
                    <div><span>Ścięcie Koniec 1:</span> <strong>${pitch1.toFixed(2)}°</strong></div>
                    <div><span>Ścięcie Koniec 2:</span> <strong>${pitch2.toFixed(2)}°</strong></div>
                    <div><span>Zacięcie Ukośnicy:</span> <strong>${edge.miterLeftDeg.toFixed(1)}° / ${edge.miterRightDeg.toFixed(1)}°</strong></div>
                    <div><span>Przekrój Drewna:</span> <strong>${timberW} x ${timberH} mm</strong></div>
                </div>
            </div>
        `;

        this.strutDetailContainer.innerHTML = html;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = NodeInspector;
} else {
    window.NodeInspector = NodeInspector;
}
