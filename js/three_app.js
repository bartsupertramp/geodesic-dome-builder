/**
 * ThreeApp - Silnik wizualizacji 3D Three.js dla kopuł geodezyjnych 1V-4V
 * z obsługą orientacji belek idealnie na płasko do paneli poszycia (Panel-Flush Alignment).
 */

class ThreeApp {
    constructor(containerId, options = {}) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
            console.error(`Nie znaleziono kontenera ${containerId}`);
            return;
        }

        this.onNodeSelect = options.onNodeSelect || (() => {});
        this.onStrutSelect = options.onStrutSelect || (() => {});

        this.displayMode = 'STRUT_TYPES';
        this.strutAlignment = 'PANEL_FLUSH'; // 'PANEL_FLUSH' (Płasko pod płyty poszycia) lub 'RADIAL' (Promieniste)
        this.showNodeLabels = true;
        this.showStrutLabels = true;
        this.labelType = 'CODE';
        this.labelScale = 0.5;
        
        this.selectedNodeId = null;
        this.selectedEdgeId = null;

        this.initScene();
        this.initLights();
        this.initControls();
        this.initRaycaster();

        window.addEventListener('resize', () => this.onWindowResize());
        this.animate();
    }

    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x0f141c);

        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
        this.camera.position.set(0, 5, 9);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.container.appendChild(this.renderer.domElement);

        const grid = new THREE.GridHelper(20, 20, 0x00d1b2, 0x2b3846);
        grid.position.y = 0;
        this.scene.add(grid);

        this.domeGroup = new THREE.Group();
        this.scene.add(this.domeGroup);

        this.nodeLabelGroup = new THREE.Group();
        this.scene.add(this.nodeLabelGroup);

        this.strutLabelGroup = new THREE.Group();
        this.scene.add(this.strutLabelGroup);
    }

    initLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
        this.scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.9);
        dirLight1.position.set(10, 20, 10);
        dirLight1.castShadow = true;
        dirLight1.shadow.mapSize.width = 2048;
        dirLight1.shadow.mapSize.height = 2048;
        this.scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0x00d1b2, 0.3);
        dirLight2.position.set(-10, 10, -10);
        this.scene.add(dirLight2);
    }

    initControls() {
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2 + 0.05;
        this.controls.target.set(0, 1.2, 0);
        this.controls.update();
    }

    initRaycaster() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();

        this.renderer.domElement.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.renderer.domElement.addEventListener('click', (e) => this.onClick(e));
    }

    setDisplayMode(mode) {
        this.displayMode = mode;
        if (this.currentData) {
            this.buildDome3D(this.currentData);
        }
    }

    setStrutAlignment(alignment) {
        this.strutAlignment = alignment;
        if (this.currentData) {
            this.buildDome3D(this.currentData);
        }
    }

    setShowNodeLabels(show) {
        this.showNodeLabels = show;
        this.nodeLabelGroup.visible = show;
    }

    setShowStrutLabels(show) {
        this.showStrutLabels = show;
        this.strutLabelGroup.visible = show;
    }

    setLabelType(type) {
        this.labelType = type;
        if (this.currentData) {
            this.buildDome3D(this.currentData);
        }
    }

    setLabelScale(scaleMultiplier) {
        this.labelScale = scaleMultiplier;
        this.updateLabelScales();
    }

    updateLabelScales() {
        const nodeBaseW = 0.14 * this.labelScale;
        const nodeBaseH = 0.07 * this.labelScale;

        this.nodeLabelGroup.children.forEach(sprite => {
            sprite.scale.set(nodeBaseW, nodeBaseH, 1);
        });

        const strutBaseW = 0.12 * this.labelScale;
        const strutBaseH = 0.06 * this.labelScale;

        this.strutLabelGroup.children.forEach(sprite => {
            sprite.scale.set(strutBaseW, strutBaseH, 1);
        });
    }

    createBadgeSprite(text, badgeColor = '#00d1b2', fontSize = 28) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 128;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = 'rgba(15, 20, 28, 0.90)';
        ctx.strokeStyle = badgeColor;
        ctx.lineWidth = 6;
        
        ctx.beginPath();
        ctx.roundRect(12, 12, 232, 104, 20);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = badgeColor;
        ctx.beginPath();
        ctx.roundRect(16, 16, 24, 96, [16, 0, 0, 16]);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 136, 64);

        const texture = new THREE.CanvasTexture(canvas);
        const spriteMat = new THREE.SpriteMaterial({
            map: texture,
            depthTest: false,
            transparent: true
        });

        const sprite = new THREE.Sprite(spriteMat);
        return sprite;
    }

    buildDome3D(domeData) {
        this.currentData = domeData;
        
        while (this.domeGroup.children.length > 0) {
            const obj = this.domeGroup.children[0];
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                else obj.material.dispose();
            }
            this.domeGroup.remove(obj);
        }

        const clearGroup = (group) => {
            while (group.children.length > 0) {
                const lbl = group.children[0];
                if (lbl.material && lbl.material.map) lbl.material.map.dispose();
                if (lbl.material) lbl.material.dispose();
                group.remove(lbl);
            }
        };

        clearGroup(this.nodeLabelGroup);
        clearGroup(this.strutLabelGroup);

        const pipeRadius = domeData.pipeRadius;
        const pipeOD = domeData.pipeODMm / 1000.0;
        const pipeHeight = Math.max(0.06, pipeOD * 0.8);
        const timberW = domeData.timberWMm / 1000.0;
        const timberH = domeData.timberHMm / 1000.0;

        // 1. Rury PVC (Węzły)
        const hubGeo = new THREE.CylinderGeometry(pipeRadius, pipeRadius, pipeHeight, 24, 1, true);
        const hubMat = new THREE.MeshStandardMaterial({
            color: 0x1a222d,
            roughness: 0.3,
            metalness: 0.2,
            side: THREE.DoubleSide
        });

        const boltGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.02, 8);
        const boltMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.1 });

        this.nodeMeshes = [];

        domeData.vertices.forEach(node => {
            const nodeGroup = new THREE.Group();
            nodeGroup.position.set(node.pos[0], node.pos[1], node.pos[2]);

            const normVec = new THREE.Vector3(node.unitPos[0], node.unitPos[1], node.unitPos[2]).normalize();
            const upVec = new THREE.Vector3(0, 1, 0);
            const q = new THREE.Quaternion().setFromUnitVectors(upVec, normVec);
            nodeGroup.quaternion.copy(q);

            const pipeMesh = new THREE.Mesh(hubGeo, hubMat.clone());
            pipeMesh.castShadow = true;
            nodeGroup.add(pipeMesh);

            const invQ = q.clone().invert();
            const nodePos = new THREE.Vector3(...node.pos);

            node.connectedEdges.forEach((edgeId) => {
                const edge = domeData.edges[edgeId];
                const otherId = edge.v1 === node.id ? edge.v2 : edge.v1;
                const otherPos = new THREE.Vector3(...domeData.vertices[otherId].pos);

                // Wektor osi centralnej belki w przestrzeni 3D
                const beamDirWorld = new THREE.Vector3().subVectors(otherPos, nodePos).normalize();

                // Przeliczenie osi belki do lokalnego układu cylindra węzła
                const beamDirLocal = beamDirWorld.clone().applyQuaternion(invQ);

                // Przecięcie promienia belki z pobocznicą cylindra (płaszczyzna X-Z)
                const lenXZ = Math.hypot(beamDirLocal.x, beamDirLocal.z);
                const scale = pipeRadius / (lenXZ || 1);

                const boltPos = new THREE.Vector3(
                    beamDirLocal.x * scale,
                    beamDirLocal.y * scale,
                    beamDirLocal.z * scale
                );

                const boltMesh = new THREE.Mesh(boltGeo, boltMat);
                boltMesh.position.copy(boltPos);

                // Orientacja śruby idealnie wzdłuż osi wzdłużnej belki
                boltMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), beamDirLocal);

                nodeGroup.add(boltMesh);
            });

            // Niewidzialna strefa kliknięcia o powiększonym promieniu ułatwiająca trafienie w węzeł
            const hitGeo = new THREE.SphereGeometry(pipeRadius * 1.5, 8, 8);
            const hitMat = new THREE.MeshBasicMaterial({ visible: false });
            const hitMesh = new THREE.Mesh(hitGeo, hitMat);
            hitMesh.userData = { type: 'NODE', nodeId: node.id, nodeData: node, pipeMesh: pipeMesh };
            nodeGroup.add(hitMesh);
            this.nodeMeshes.push(hitMesh);

            pipeMesh.userData = { type: 'NODE', nodeId: node.id, nodeData: node, pipeMesh: pipeMesh };
            this.domeGroup.add(nodeGroup);
            this.nodeMeshes.push(pipeMesh);

            const labelText = `#${node.id + 1} ${node.nodeTypeCode || 'W'}`;
            const spriteColor = node.nodeTypeColor || '#00d1b2';
            const sprite = this.createBadgeSprite(labelText, spriteColor, 28);
            
            const spritePos = new THREE.Vector3(...node.pos).add(normVec.clone().multiplyScalar(0.08));
            sprite.position.copy(spritePos);
            sprite.userData = { type: 'NODE', nodeId: node.id, nodeData: node, pipeMesh: pipeMesh };
            this.nodeLabelGroup.add(sprite);
            this.nodeMeshes.push(sprite);
        });

        // Mapowanie normalnych ścian przyległych dla pozycjonowania belek płasko pod płyty
        const edgeNormals = new Map();
        domeData.faces.forEach(face => {
            const norm = new THREE.Vector3(...face.normal);
            const pairs = [
                [face.verts[0], face.verts[1]],
                [face.verts[1], face.verts[2]],
                [face.verts[2], face.verts[0]]
            ];
            pairs.forEach(pair => {
                const key = pair[0] < pair[1] ? `${pair[0]}-${pair[1]}` : `${pair[1]}-${pair[0]}`;
                if (!edgeNormals.has(key)) {
                    edgeNormals.set(key, []);
                }
                edgeNormals.get(key).push(norm);
            });
        });

        // 2. Belki Drewniane z Orientacją Płasko pod Płyty Poszycia (Panel-Flush Alignment)
        this.strutMeshes = [];

        domeData.edges.forEach(edge => {
            const v1Pos = new THREE.Vector3(...domeData.vertices[edge.v1].pos);
            const v2Pos = new THREE.Vector3(...domeData.vertices[edge.v2].pos);

            const dir = new THREE.Vector3().subVectors(v2Pos, v1Pos);
            const fullLen = dir.length();
            dir.normalize();

            const actualCutLen = Math.max(0.05, fullLen - 2 * pipeRadius);
            const midPoint = new THREE.Vector3().addVectors(v1Pos, v2Pos).multiplyScalar(0.5);

            const strutGeo = new THREE.BoxGeometry(timberW, timberH, actualCutLen);

            let strutColor = edge.color || '#FF4136';
            
            if (this.displayMode === 'PITCH_HEATMAP') {
                const avgPitch = (domeData.vertices[edge.v1].pitchAngleDeg + domeData.vertices[edge.v2].pitchAngleDeg) / 2;
                const normVal = Math.min(1.0, Math.max(0.0, (avgPitch - 4.0) / 7.0));
                const hue = (1.0 - normVal) * 0.33;
                strutColor = new THREE.Color().setHSL(hue, 0.9, 0.5);
            } else if (this.displayMode === 'WOOD') {
                strutColor = '#C19A6B';
            }

            const strutMat = new THREE.MeshStandardMaterial({
                color: strutColor,
                roughness: 0.4,
                metalness: 0.1
            });

            const strutMesh = new THREE.Mesh(strutGeo, strutMat);
            strutMesh.position.copy(midPoint);

            // Wyznacz wektor góra (UpVector) dla belki:
            // W trybie PANEL_FLUSH szeroka zewnętrzna płaszczyzna deski leży idealnie płasko z płaszczyzną trójkąta (Face Normal)
            let upVec = new THREE.Vector3(0, 1, 0);
            
            const key = edge.v1 < edge.v2 ? `${edge.v1}-${edge.v2}` : `${edge.v2}-${edge.v1}`;
            const norms = edgeNormals.get(key);

            if (this.strutAlignment === 'PANEL_FLUSH' && norms && norms.length > 0) {
                // Średnia wektorów normalnych przyległych ścian trójkątnych
                const avgNorm = new THREE.Vector3();
                norms.forEach(n => avgNorm.add(n));
                avgNorm.normalize();
                upVec.copy(avgNorm);
            } else {
                // Orientacja promienista ze środka kuli
                upVec.copy(midPoint).normalize();
            }

            const mat = new THREE.Matrix4();
            mat.lookAt(v1Pos, v2Pos, upVec);
            strutMesh.quaternion.setFromRotationMatrix(mat);

            strutMesh.castShadow = true;
            strutMesh.receiveShadow = true;

            strutMesh.userData = { type: 'STRUT', edgeId: edge.id, edgeData: edge };
            this.domeGroup.add(strutMesh);
            this.strutMeshes.push(strutMesh);

            const variantText = `#${edge.id + 1} ${edge.strutType}`;
            const strutSprite = this.createBadgeSprite(variantText, strutColor, 28);
            const labelPos = midPoint.clone().add(upVec.clone().multiplyScalar(0.04));
            strutSprite.position.copy(labelPos);
            this.strutLabelGroup.add(strutSprite);
        });

        // 3. Poszycie Trójkątne
        if (this.displayMode === 'FACES') {
            const faceMat = new THREE.MeshStandardMaterial({
                color: 0x00d1b2,
                transparent: true,
                opacity: 0.25,
                side: THREE.DoubleSide
            });

            domeData.faces.forEach(face => {
                const geom = new THREE.BufferGeometry();
                const p0 = domeData.vertices[face.verts[0]].pos;
                const p1 = domeData.vertices[face.verts[1]].pos;
                const p2 = domeData.vertices[face.verts[2]].pos;

                const positions = new Float32Array([...p0, ...p1, ...p2]);
                geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                geom.computeVertexNormals();

                const faceMesh = new THREE.Mesh(geom, faceMat);
                this.domeGroup.add(faceMesh);
            });
        }

        this.nodeLabelGroup.visible = this.showNodeLabels;
        this.strutLabelGroup.visible = this.showStrutLabels;
        this.updateLabelScales();
    }

    highlightNodeType(nodeTypeCode) {
        this.nodeMeshes.forEach(mesh => {
            const nodeData = mesh.userData.nodeData;
            if (nodeData && nodeData.nodeTypeCode === nodeTypeCode) {
                mesh.material.emissive?.setHex(0x00ffff);
            } else {
                mesh.material.emissive?.setHex(0x000000);
            }
        });
    }

    highlightStrutVariant(variantCode) {
        this.strutMeshes.forEach(mesh => {
            const edgeData = mesh.userData.edgeData;
            if (edgeData && edgeData.variantCode === variantCode) {
                mesh.material.emissive?.setHex(0x00ffff);
            } else {
                mesh.material.emissive?.setHex(0x000000);
            }
        });
    }

    onMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects([...this.nodeMeshes, ...this.strutMeshes]);

        if (intersects.length > 0) {
            const hit = intersects[0].object;
            if (this.hoveredMesh !== hit) {
                if (this.hoveredMesh && this.hoveredMesh !== this.selectedMesh) {
                    this.hoveredMesh.material.emissive?.setHex(0x000000);
                }
                this.hoveredMesh = hit;
                if (hit !== this.selectedMesh) {
                    hit.material.emissive?.setHex(0x333333);
                }
                this.renderer.domElement.style.cursor = 'pointer';
            }
        } else {
            if (this.hoveredMesh && this.hoveredMesh !== this.selectedMesh) {
                this.hoveredMesh.material.emissive?.setHex(0x000000);
            }
            this.hoveredMesh = null;
            this.renderer.domElement.style.cursor = 'default';
        }
    }

    onClick(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects([...this.nodeMeshes, ...this.strutMeshes]);

        if (intersects.length > 0) {
            const hitObj = intersects[0].object;
            const hitData = hitObj.userData;
            
            if (this.selectedMesh && this.selectedMesh.material && this.selectedMesh.material.emissive) {
                this.selectedMesh.material.emissive.setHex(0x000000);
            }

            const targetMesh = hitData.pipeMesh || hitObj;
            this.selectedMesh = targetMesh;
            if (targetMesh.material && targetMesh.material.emissive) {
                targetMesh.material.emissive.setHex(0x00ffff);
            }

            if (hitData.type === 'NODE') {
                this.selectedNodeId = hitData.nodeId;
                this.onNodeSelect(hitData.nodeData);
            } else if (hitData.type === 'STRUT') {
                this.selectedEdgeId = hitData.edgeId;
                this.onStrutSelect(hitData.edgeData);
            }
        }
    }

    selectNodeById(nodeId) {
        const nodeMesh = this.nodeMeshes.find(m => m.userData && m.userData.type === 'NODE' && m.userData.nodeId === nodeId && m.userData.pipeMesh === m);
        if (nodeMesh) {
            if (this.selectedMesh && this.selectedMesh.material && this.selectedMesh.material.emissive) {
                this.selectedMesh.material.emissive.setHex(0x000000);
            }
            this.selectedMesh = nodeMesh;
            if (nodeMesh.material && nodeMesh.material.emissive) {
                nodeMesh.material.emissive.setHex(0x00ffff);
            }
        }
    }

    onWindowResize() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        this.controls.update();
        this.renderer.render(this.scene, this.camera);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = ThreeApp;
} else {
    window.ThreeApp = ThreeApp;
}
