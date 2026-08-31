/**
 * NodeInspector - Inspektor Węzła 2D i Trójwymiarowa Przeglądarka 3D Węzła (Mini 3D Inspector)
 * Pozwala na oglądanie pojedynczego łącznika PVC w pełnym 3D z ugięciem sferycznym i kątami zacięć.
 */

class NodeInspector {
    constructor(canvas2dId, profileCanvasId, detailContainerId, canvas3dNodeId) {
        this.canvas2d = document.getElementById(canvas2dId);
        this.ctx2d = this.canvas2d ? this.canvas2d.getContext('2d') : null;
        
        this.profileCanvas = document.getElementById(profileCanvasId);
        this.ctxProfile = this.profileCanvas ? this.profileCanvas.getContext('2d') : null;

        this.detailContainer = document.getElementById(detailContainerId);
        this.canvas3dNodeContainer = document.getElementById(canvas3dNodeId);

        this.drillingMode = 'UNIFORM'; // 'UNIFORM' (Równomierne 60°/72°) lub 'SPHERICAL' (Precyzyjne 4V)

        if (this.canvas3dNodeContainer) {
            this.init3DNodeInspector();
        }
    }

    setDrillingMode(mode) {
        this.drillingMode = mode;
        if (this.currentNodeData && this.currentFullDomeData) {
            this.renderNode(this.currentNodeData, this.currentFullDomeData);
        }
    }

    /**
     * Inicjalizacja dedykowanego mini-silnika 3D dla pojedynczego węzła
     */
    init3DNodeInspector() {
        const width = this.canvas3dNodeContainer.clientWidth || 340;
        const height = this.canvas3dNodeContainer.clientHeight || 240;

        this.scene3d = new THREE.Scene();
        this.scene3d.background = new THREE.Color(0x161e27);

        this.camera3d = new THREE.PerspectiveCamera(40, width / height, 0.01, 20);
        this.camera3d.position.set(0, 0.4, 0.6);

        this.renderer3d = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer3d.setSize(width, height);
        this.renderer3d.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer3d.shadowMap.enabled = true;

        this.canvas3dNodeContainer.appendChild(this.renderer3d.domElement);

        // Oświetlenie mini sceny 3D
        const ambient = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene3d.add(ambient);

        const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
        dirLight.position.set(2, 4, 3);
        dirLight.castShadow = true;
        this.scene3d.add(dirLight);

        const fillLight = new THREE.DirectionalLight(0x00d1b2, 0.4);
        fillLight.position.set(-2, -1, -2);
        this.scene3d.add(fillLight);

        this.controls3d = new THREE.OrbitControls(this.camera3d, this.renderer3d.domElement);
        this.controls3d.enableDamping = true;
        this.controls3d.dampingFactor = 0.08;
        this.controls3d.target.set(0, 0, 0);
        this.controls3d.update();

        this.nodeGroup3d = new THREE.Group();
        this.scene3d.add(this.nodeGroup3d);

        this.animate3D();
    }

    animate3D() {
        requestAnimationFrame(() => this.animate3D());
        if (this.controls3d) this.controls3d.update();
        if (this.renderer3d && this.scene3d && this.camera3d) {
            this.renderer3d.render(this.scene3d, this.camera3d);
        }
    }

    renderNode(nodeData, fullDomeData) {
        this.currentNodeData = nodeData;
        this.currentFullDomeData = fullDomeData;

        const detail = fullDomeData.nodeDetails[nodeData.id];
        if (!detail) return;

        this.draw2dHub(detail, fullDomeData);
        this.drawProfile(detail);
        this.render3DNodeModel(detail, fullDomeData);
        this.renderTable(detail, fullDomeData);
    }

    /**
     * Renders high-detail 3D isolated node model with timber miter cuts & PVC hub
     */
    render3DNodeModel(detail, fullDomeData) {
        if (!this.nodeGroup3d) return;

        while (this.nodeGroup3d.children.length > 0) {
            const obj = this.nodeGroup3d.children[0];
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
            this.nodeGroup3d.remove(obj);
        }

        const pipeRadius = fullDomeData.pipeRadius || 0.055;
        const pipeHeight = Math.max(0.06, (fullDomeData.pipeODMm / 1000.0) * 0.8);
        const timberW = (fullDomeData.timberWMm || 45) / 1000.0;
        const timberH = (fullDomeData.timberHMm || 45) / 1000.0;

        // 1. Rura PVC Łącznika
        const hubGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeHeight, 32, 1, true);
        const hubMat = new THREE.MeshStandardMaterial({
            color: 0x222a35,
            roughness: 0.3,
            metalness: 0.3,
            side: THREE.DoubleSide
        });

        const pipeMesh = new THREE.Mesh(hubGeo, hubMat);
        pipeMesh.castShadow = true;
        this.nodeGroup3d.add(pipeMesh);

        // Krawędź turkusowa pierścienia rury
        const rimGeo = new THREE.TorusGeometry(pipeRadius, 0.003, 16, 48);
        const rimMat = new THREE.MeshBasicMaterial({ color: 0x00d1b2 });
        const rimTop = new THREE.Mesh(rimGeo, rimMat);
        rimTop.rotation.x = Math.PI / 2;
        rimTop.position.y = pipeHeight / 2;
        this.nodeGroup3d.add(rimTop);

        const boltGeo = new THREE.CylinderGeometry(0.006, 0.006, 0.02, 12);
        const boltMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });

        // 2. Ramiona Belek Dochodzących z dociętym czołem i śrubami
        const valency = detail.struts.length;

        detail.struts.forEach((strut, idx) => {
            // Kąt dochodzenia belki
            let angleDeg = strut.azimuthDeg;
            if (this.drillingMode === 'UNIFORM') {
                angleDeg = (idx / valency) * 360.0;
            }

            const rad = (angleDeg * Math.PI) / 180.0;
            const strutLen = 0.22; // długość próbna belki w podglądzie

            // Drewniana belka docięta z nachyleniem ugięcia (pitch)
            const strutGeo = new THREE.BoxGeometry(timberW, timberH, strutLen);
            const strutMat = new THREE.MeshStandardMaterial({
                color: strut.color || 0xC19A6B,
                roughness: 0.5,
                metalness: 0.1
            });

            const strutMesh = new THREE.Mesh(strutGeo, strutMat);

            // Pozycja belki zaczynająca się od krawędzi rury PVC
            const centerDist = pipeRadius + strutLen / 2;
            strutMesh.position.set(
                centerDist * Math.cos(rad),
                0,
                centerDist * Math.sin(rad)
            );

            // Obrót belki wokół rury i ugięcie sferyczne (pitch angle)
            strutMesh.rotation.y = -rad + Math.PI / 2;
            
            // Ugięcie sferyczne w górę/dół
            const pitchRad = (detail.pitchAngleDeg * Math.PI) / 180.0;
            strutMesh.rotation.z = pitchRad * 0.3;

            strutMesh.castShadow = true;
            this.nodeGroup3d.add(strutMesh);

            // Śruba mocująca wewnątrz rury
            const boltMesh = new THREE.Mesh(boltGeo, boltMat);
            boltMesh.position.set(
                (pipeRadius - 0.006) * Math.cos(rad),
                0,
                (pipeRadius - 0.006) * Math.sin(rad)
            );
            this.nodeGroup3d.add(boltMesh);
        });

        // Reset pozycji kamery 3D dla czytelnego podglądu
        this.camera3d.position.set(0, 0.35, 0.45);
        this.controls3d.target.set(0, 0, 0);
        this.controls3d.update();
    }

    /**
     * Rysuje czytelny dwuwymiarowy widok pierścienia PVC od góry bez nachodzenia tekstów
     */
    draw2dHub(detail, fullDomeData) {
        if (!this.ctx2d) return;

        const ctx = this.ctx2d;
        const width = this.canvas2d.width;
        const height = this.canvas2d.height;
        const centerX = width / 2;
        const centerY = height / 2;

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#10161f';
        ctx.fillRect(0, 0, width, height);

        const pipeRadiusPx = Math.min(width, height) * 0.17;
        const strutLengthPx = Math.min(width, height) * 0.30;
        const timberW = Math.max(14, Math.min(width, height) * 0.055);

        const valency = detail.struts.length;

        // 1. Belki i Etykiety Zacięć
        detail.struts.forEach((strut, idx) => {
            let angleDeg = strut.azimuthDeg;
            if (this.drillingMode === 'UNIFORM') {
                angleDeg = (idx / valency) * 360.0;
            }

            const rad = (angleDeg * Math.PI) / 180.0;

            ctx.save();
            ctx.translate(centerX, centerY);
            ctx.rotate(rad);

            const startX = pipeRadiusPx;

            // Drewniana belka
            ctx.fillStyle = strut.color || '#C19A6B';
            ctx.fillRect(startX, -timberW / 2, strutLengthPx, timberW);

            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.5;
            ctx.strokeRect(startX, -timberW / 2, strutLengthPx, timberW);

            // Kąt zacięcia po lewej i prawej stronie (czytelny zapis)
            ctx.fillStyle = '#00ffff';
            ctx.font = 'bold 10px monospace';
            
            // Unikaj odwróconych napisów na dolnej połowie koła
            const isBottomHalf = angleDeg > 90 && angleDeg < 270;
            if (isBottomHalf) {
                ctx.save();
                ctx.translate(startX + 35, 0);
                ctx.rotate(Math.PI);
                ctx.fillText(`L:${strut.miterLeftDeg.toFixed(1)}°`, 0, timberW / 2 + 10);
                ctx.fillText(`P:${strut.miterRightDeg.toFixed(1)}°`, 0, -timberW / 2 - 3);
                ctx.restore();
            } else {
                ctx.fillText(`L:${strut.miterLeftDeg.toFixed(1)}°`, startX + 15, -timberW / 2 - 4);
                ctx.fillText(`P:${strut.miterRightDeg.toFixed(1)}°`, startX + 15, timberW / 2 + 12);
            }

            // Etykieta typu belki (A, B, C...)
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 12px sans-serif';
            ctx.fillText(strut.strutType, startX + strutLengthPx - 16, 4);

            ctx.restore();
        });

        // 2. Pierścień PVC Rury
        ctx.beginPath();
        ctx.arc(centerX, centerY, pipeRadiusPx, 0, Math.PI * 2);
        ctx.fillStyle = '#1e2632';
        ctx.fill();
        ctx.lineWidth = 5;
        ctx.strokeStyle = '#00d1b2';
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(centerX, centerY, pipeRadiusPx * 0.72, 0, Math.PI * 2);
        ctx.fillStyle = '#0f141c';
        ctx.fill();

        // 3. Śruby mocujące
        detail.struts.forEach((strut, idx) => {
            let angleDeg = strut.azimuthDeg;
            if (this.drillingMode === 'UNIFORM') {
                angleDeg = (idx / valency) * 360.0;
            }
            const rad = (angleDeg * Math.PI) / 180.0;

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

        // Etykieta środkowa
        ctx.fillStyle = '#00d1b2';
        ctx.font = 'bold 13px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(detail.nodeTypeCode || detail.type, centerX, centerY);
    }

    /**
     * Widok profilowy ugięcia węzła (Pitch Gauge)
     */
    drawProfile(detail) {
        if (!this.ctxProfile) return;

        const ctx = this.ctxProfile;
        const width = this.profileCanvas.width;
        const height = this.profileCanvas.height;
        const centerX = width / 2;
        const centerY = height * 0.72;

        ctx.clearRect(0, 0, width, height);

        ctx.fillStyle = '#10161f';
        ctx.fillRect(0, 0, width, height);

        ctx.strokeStyle = '#2b3846';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(20, centerY);
        ctx.lineTo(width - 20, centerY);
        ctx.stroke();
        ctx.setLineDash([]);

        const pitchRad = (detail.pitchAngleDeg * Math.PI) / 180.0;
        const armLen = width * 0.36;

        const leftX = centerX - armLen * Math.cos(pitchRad);
        const leftY = centerY - armLen * Math.sin(pitchRad);

        const rightX = centerX + armLen * Math.cos(pitchRad);
        const rightY = centerY - armLen * Math.sin(pitchRad);

        ctx.strokeStyle = detail.type === 'PENTAGON' ? '#ff3860' : '#3273dc';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(leftX, leftY);
        ctx.lineTo(centerX, centerY - 12);
        ctx.lineTo(rightX, rightY);
        ctx.stroke();

        ctx.fillStyle = '#1e2632';
        ctx.fillRect(centerX - 14, centerY - 22, 28, 18);
        ctx.strokeStyle = '#00d1b2';
        ctx.strokeRect(centerX - 14, centerY - 22, 28, 18);

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Ugięcie Sferyczne Węzła (Pitch Angle): ${detail.pitchAngleDeg.toFixed(2)}°`, centerX, 18);
    }

    renderTable(detail, fullDomeData) {
        if (!this.detailContainer) return;

        let html = `
            <div class="node-summary-card">
                <div class="node-badge node-${detail.type.toLowerCase()}">
                    WĘZEŁ ${detail.nodeTypeCode || ('#' + detail.nodeId)} (${detail.type})
                </div>
                <div class="node-stats">
                    <div><span>Wypukłość Sferyczna:</span> <strong>${detail.pitchAngleDeg.toFixed(2)}°</strong></div>
                    <div><span>Rura PVC:</span> <strong>${fullDomeData.pipeODMm} mm</strong></div>
                    <div><span>Liczba Ramion:</span> <strong>${detail.struts.length}</strong></div>
                    <div><span>Tryb Wierceń:</span> <strong>${this.drillingMode === 'UNIFORM' ? 'Równomierny (60°/72°)' : 'Precyzyjny 4V'}</strong></div>
                </div>
            </div>
            
            <table class="cut-table">
                <thead>
                    <tr>
                        <th>Belka</th>
                        <th>Kąt Dojścia</th>
                        <th>Dł. Docięcia</th>
                        <th>Zacięcie L</th>
                        <th>Zacięcie P</th>
                    </tr>
                </thead>
                <tbody>
        `;

        const valency = detail.struts.length;

        detail.struts.forEach((s, idx) => {
            let angleDeg = s.azimuthDeg;
            if (this.drillingMode === 'UNIFORM') {
                angleDeg = (idx / valency) * 360.0;
            }

            html += `
                <tr>
                    <td><span class="strut-tag" style="background-color:${s.color}">${s.strutType}</span></td>
                    <td>${angleDeg.toFixed(1)}°</td>
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
