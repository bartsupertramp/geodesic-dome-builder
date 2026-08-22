/**
 * GeodesicMath - Precyzyjny silnik matematyczny geometrii 1V, 2V, 3V, 4V (Ikosaedr Class 1 Method 1)
 * Zorientowany w osi Y (Zenith = Y+), tworzący płaską podwalinę na poziomie Y=0,
 * z wyznaczaniem długości docięcia drewna, kątów zacięć bocznych, wariantów A1..F1 i typów węzłów W1..W7.
 */

class GeodesicMath {
    constructor() {
        const r = 2.0 / Math.sqrt(5);
        const yUpper = 1.0 / Math.sqrt(5);
        const yLower = -1.0 / Math.sqrt(5);

        const rawIcoVerts = [[0.0, 1.0, 0.0]];

        for (let i = 0; i < 5; i++) {
            const angle = (i * 2 * Math.PI) / 5;
            rawIcoVerts.push([r * Math.cos(angle), yUpper, r * Math.sin(angle)]);
        }

        for (let i = 0; i < 5; i++) {
            const angle = ((i + 0.5) * 2 * Math.PI) / 5;
            rawIcoVerts.push([r * Math.cos(angle), yLower, r * Math.sin(angle)]);
        }

        rawIcoVerts.push([0.0, -1.0, 0.0]);

        this.icoVerts = rawIcoVerts.map(v => this.normalize(v));

        this.icoFaces = [
            [0, 1, 2], [0, 2, 3], [0, 3, 4], [0, 4, 5], [0, 5, 1],
            [1, 6, 2], [2, 6, 7], [2, 7, 3], [3, 7, 8], [3, 8, 4],
            [4, 8, 9], [4, 9, 5], [5, 9, 10], [5, 10, 1], [1, 10, 6],
            [11, 7, 6], [11, 8, 7], [11, 9, 8], [11, 10, 9], [11, 6, 10]
        ];

        this.strutMeta = {
            'A': { color: '#FF4136', name: 'Belka A (Czerwona)' },
            'B': { color: '#0074D9', name: 'Belka B (Niebieska)' },
            'C': { color: '#2ECC40', name: 'Belka C (Zielona)' },
            'D': { color: '#FFDC00', name: 'Belka D (Żółta)' },
            'E': { color: '#B10DC9', name: 'Belka E (Fioletowa)' },
            'F': { color: '#FF851B', name: 'Belka F (Pomarańczowa)' },
            'G': { color: '#00D1B2', name: 'Belka G (Turkusowa)' },
            'H': { color: '#E056FD', name: 'Belka H (Różowa)' }
        };

        this.nodeTypeColors = [
            '#FF3860', '#3273DC', '#23D160', '#FFDD57', '#B55400', '#9B51E0', '#00D1B2', '#E056FD'
        ];
    }

    normalize(v) {
        const len = Math.sqrt(v[0] * v[0] + v[1] * v[1] + v[2] * v[2]);
        if (len < 1e-9) return [0, 0, 0];
        return [v[0] / len, v[1] / len, v[2] / len];
    }

    dot(v1, v2) {
        return v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2];
    }

    cross(v1, v2) {
        return [
            v1[1] * v2[2] - v1[2] * v2[1],
            v1[2] * v2[0] - v1[0] * v2[2],
            v1[0] * v2[1] - v1[1] * v2[0]
        ];
    }

    dist(v1, v2) {
        return Math.sqrt(
            Math.pow(v1[0] - v2[0], 2) +
            Math.pow(v1[1] - v2[1], 2) +
            Math.pow(v1[2] - v2[2], 2)
        );
    }

    angleBetween(v1, v2) {
        const d = Math.max(-1, Math.min(1, this.dot(this.normalize(v1), this.normalize(v2))));
        return Math.acos(d);
    }

    /**
     * Generuje podział ikosaedru dla dowolnej częstotliwości NV (1V, 2V, 3V, 4V)
     */
    generateSphereNV(frequency = 4) {
        const freq = Math.max(1, Math.min(6, parseInt(frequency) || 4));
        const vertices = [];
        const vertMap = new Map();

        const getVertId = (v) => {
            const key = `${v[0].toFixed(6)},${v[1].toFixed(6)},${v[2].toFixed(6)}`;
            if (!vertMap.has(key)) {
                vertMap.set(key, vertices.length);
                vertices.push(v);
            }
            return vertMap.get(key);
        };

        const faces = [];
        const edgeSet = new Map();

        for (const face of this.icoFaces) {
            const v0 = this.icoVerts[face[0]];
            const v1 = this.icoVerts[face[1]];
            const v2 = this.icoVerts[face[2]];

            const grid = {};
            for (let i = 0; i <= freq; i++) {
                for (let j = 0; j <= freq - i; j++) {
                    const k = freq - i - j;
                    const x = (i * v0[0] + j * v1[0] + k * v2[0]) / parseFloat(freq);
                    const y = (i * v0[1] + j * v1[1] + k * v2[1]) / parseFloat(freq);
                    const z = (i * v0[2] + j * v1[2] + k * v2[2]) / parseFloat(freq);
                    grid[`${i},${j},${k}`] = getVertId(this.normalize([x, y, z]));
                }
            }

            for (let i = 0; i < freq; i++) {
                for (let j = 0; j < freq - i; j++) {
                    const k = freq - i - j;
                    const vA = grid[`${i + 1},${j},${k - 1}`];
                    const vB = grid[`${i},${j + 1},${k - 1}`];
                    const vC = grid[`${i},${j},${k}`];

                    faces.push([vA, vB, vC]);
                    this.addEdge(edgeSet, vA, vB);
                    this.addEdge(edgeSet, vB, vC);
                    this.addEdge(edgeSet, vC, vA);

                    if (k >= 2) {
                        const vD = grid[`${i + 1},${j + 1},${k - 2}`];
                        faces.push([vB, vA, vD]);
                        this.addEdge(edgeSet, vA, vD);
                        this.addEdge(edgeSet, vB, vD);
                    }
                }
            }
        }

        return { vertices, faces, edges: Array.from(edgeSet.values()) };
    }

    addEdge(edgeMap, v1, v2) {
        const key = v1 < v2 ? `${v1}-${v2}` : `${v2}-${v1}`;
        if (!edgeMap.has(key)) {
            edgeMap.set(key, { v1: Math.min(v1, v2), v2: Math.max(v1, v2) });
        }
    }

    calculateDome(params) {
        const radius = params.radius || 3.0;
        const pipeOD = (params.pipeOD || 110) / 1000.0;
        const pipeRadius = pipeOD / 2.0;
        const timberW = (params.timberW || 45) / 1000.0;
        const timberH = (params.timberH || 45) / 1000.0;
        const truncation = params.truncation || 0.5;
        const frequency = parseInt(params.frequency) || 4;

        const sphere = this.generateSphereNV(frequency);

        let minY = -0.001;
        if (truncation === 0.375) minY = 0.276;
        else if (truncation === 0.625) minY = -0.276;

        const domeVertIndices = [];
        const vertIndexMap = new Map();
        
        sphere.vertices.forEach((v, idx) => {
            if (v[1] >= minY) {
                vertIndexMap.set(idx, domeVertIndices.length);
                domeVertIndices.push(idx);
            }
        });

        const domeVertices = domeVertIndices.map(idx => {
            const v = sphere.vertices[idx];
            const isBase = Math.abs(v[1] - minY) < 0.02 || v[1] <= minY + 0.01;
            
            return {
                id: vertIndexMap.get(idx),
                origId: idx,
                pos: [v[0] * radius, v[1] * radius, v[2] * radius],
                unitPos: v,
                neighbors: [],
                connectedEdges: [],
                type: isBase ? 'BASE' : 'HEXAGON',
                pitchAngleDeg: 0,
                isBase: isBase
            };
        });

        const domeEdges = [];
        const lengthGroups = new Map();

        sphere.edges.forEach(e => {
            if (vertIndexMap.has(e.v1) && vertIndexMap.has(e.v2)) {
                const u1 = vertIndexMap.get(e.v1);
                const u2 = vertIndexMap.get(e.v2);

                const p1 = domeVertices[u1].unitPos;
                const p2 = domeVertices[u2].unitPos;
                const chordFactor = this.dist(p1, p2);

                const key = chordFactor.toFixed(4);
                if (!lengthGroups.has(key)) {
                    lengthGroups.set(key, { factor: chordFactor, count: 0 });
                }
                lengthGroups.get(key).count++;

                const isBaseEdge = domeVertices[u1].isBase && domeVertices[u2].isBase;

                domeEdges.push({
                    id: domeEdges.length,
                    v1: u1,
                    v2: u2,
                    chordFactor: chordFactor,
                    centerLen: chordFactor * radius,
                    strutType: '',
                    isBaseEdge: isBaseEdge
                });
            }
        });

        const sortedGroups = Array.from(lengthGroups.values()).sort((a, b) => a.factor - b.factor);
        const typeLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

        sortedGroups.forEach((group, idx) => {
            group.type = typeLabels[idx] || `S${idx}`;
            group.meta = this.strutMeta[group.type] || { color: '#AAAAAA', name: `Belka ${group.type}` };
        });

        domeEdges.forEach(e => {
            for (const group of sortedGroups) {
                if (Math.abs(group.factor - e.chordFactor) < 0.0003) {
                    e.strutType = group.type;
                    e.color = group.meta.color;
                    break;
                }
            }
            e.cutLen = Math.max(0, e.centerLen - 2 * pipeRadius);

            domeVertices[e.v1].neighbors.push(e.v2);
            domeVertices[e.v1].connectedEdges.push(e.id);
            domeVertices[e.v2].neighbors.push(e.v1);
            domeVertices[e.v2].connectedEdges.push(e.id);
        });

        const domeFaces = [];
        sphere.faces.forEach(f => {
            if (vertIndexMap.has(f[0]) && vertIndexMap.has(f[1]) && vertIndexMap.has(f[2])) {
                const u0 = vertIndexMap.get(f[0]);
                const u1 = vertIndexMap.get(f[1]);
                const u2 = vertIndexMap.get(f[2]);
                
                const p0 = domeVertices[u0].pos;
                const p1 = domeVertices[u1].pos;
                const p2 = domeVertices[u2].pos;

                const v10 = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
                const v20 = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
                const norm = this.normalize(this.cross(v10, v20));

                domeFaces.push({
                    id: domeFaces.length,
                    verts: [u0, u1, u2],
                    normal: norm
                });
            }
        });

        domeVertices.forEach(node => {
            const valency = node.neighbors.length;

            if (node.isBase) {
                node.type = 'BASE';
            } else if (valency === 5) {
                node.type = 'PENTAGON';
            } else {
                node.type = 'HEXAGON';
            }

            const hubNormal = node.unitPos;
            let totalPitch = 0;

            node.connectedEdges.forEach(edgeId => {
                const edge = domeEdges[edgeId];
                const otherVertId = edge.v1 === node.id ? edge.v2 : edge.v1;
                const otherPos = domeVertices[otherVertId].pos;

                const strutVec = [
                    otherPos[0] - node.pos[0],
                    otherPos[1] - node.pos[1],
                    otherPos[2] - node.pos[2]
                ];

                const normStrut = this.normalize(strutVec);
                const angleFromNormal = this.angleBetween(hubNormal, normStrut);
                const pitch = Math.abs(90.0 - (angleFromNormal * 180 / Math.PI));
                totalPitch += pitch;
            });

            node.pitchAngleDeg = totalPitch / (node.connectedEdges.length || 1);
        });

        // Klasyfikacja rodzajów węzłów (W1 - W7)
        const nodeTypeMap = new Map();

        domeVertices.forEach(node => {
            const strutTypesSorted = node.connectedEdges
                .map(edgeId => domeEdges[edgeId].strutType)
                .sort();
            
            const signature = `${node.type}:${strutTypesSorted.join('-')}`;
            
            if (!nodeTypeMap.has(signature)) {
                nodeTypeMap.set(signature, {
                    signature,
                    baseType: node.type,
                    strutPattern: strutTypesSorted.join('-'),
                    valency: strutTypesSorted.length,
                    count: 0,
                    nodes: []
                });
            }
            const typeInfo = nodeTypeMap.get(signature);
            typeInfo.count++;
            typeInfo.nodes.push(node.id);
        });

        const sortedNodeTypes = Array.from(nodeTypeMap.values()).sort((a, b) => {
            if (a.baseType === 'PENTAGON' && b.baseType !== 'PENTAGON') return -1;
            if (a.baseType !== 'PENTAGON' && b.baseType === 'PENTAGON') return 1;
            return b.count - a.count;
        });

        const summaryByNodeType = {};

        sortedNodeTypes.forEach((nt, idx) => {
            const code = `W${idx + 1}`;
            nt.code = code;
            nt.color = this.nodeTypeColors[idx % this.nodeTypeColors.length];

            let desc = '';
            if (nt.baseType === 'PENTAGON') {
                desc = `Pentagon (${nt.valency} ramion: ${nt.strutPattern})`;
            } else if (nt.baseType === 'HEXAGON') {
                desc = `Heksagon (${nt.valency} ramion: ${nt.strutPattern})`;
            } else {
                desc = `Węzeł Podstawy (${nt.valency} ramiona: ${nt.strutPattern})`;
            }
            nt.description = desc;

            nt.nodes.forEach(nodeId => {
                domeVertices[nodeId].nodeTypeCode = code;
                domeVertices[nodeId].nodeTypeColor = nt.color;
                domeVertices[nodeId].nodeTypePattern = nt.strutPattern;
            });

            summaryByNodeType[code] = {
                code,
                baseType: nt.baseType,
                description: desc,
                strutPattern: nt.strutPattern,
                valency: nt.valency,
                color: nt.color,
                count: nt.count,
                nodeIds: nt.nodes
            };
        });

        // Kąty zacięć bocznych wokół rury PVC
        const nodeDetails = {};

        domeVertices.forEach(node => {
            const nPos = node.pos;
            const nNorm = node.unitPos;

            let arbitrary = [0, 0, 1];
            if (Math.abs(nNorm[2]) > 0.9) arbitrary = [1, 0, 0];
            const uTangent = this.normalize(this.cross(nNorm, arbitrary));
            const vBitangent = this.normalize(this.cross(nNorm, uTangent));

            const edgeAngles = node.connectedEdges.map(edgeId => {
                const edge = domeEdges[edgeId];
                const otherId = edge.v1 === node.id ? edge.v2 : edge.v1;
                const otherPos = domeVertices[otherId].pos;

                const dir = [
                    otherPos[0] - nPos[0],
                    otherPos[1] - nPos[1],
                    otherPos[2] - nPos[2]
                ];

                const projU = this.dot(dir, uTangent);
                const projV = this.dot(dir, vBitangent);
                let angle = Math.atan2(projV, projU) * (180 / Math.PI);
                if (angle < 0) angle += 360;

                return { edgeId, edge, otherId, angle };
            });

            edgeAngles.sort((a, b) => a.angle - b.angle);

            const nodeStruts = [];
            const count = edgeAngles.length;
            for (let i = 0; i < count; i++) {
                const curr = edgeAngles[i];
                const prev = edgeAngles[(i - 1 + count) % count];
                const next = edgeAngles[(i + 1) % count];

                let deltaLeft = (curr.angle - prev.angle + 360) % 360;
                let deltaRight = (next.angle - curr.angle + 360) % 360;

                const miterLeft = 90.0 - (deltaLeft / 2.0);
                const miterRight = 90.0 - (deltaRight / 2.0);

                nodeStruts.push({
                    edgeId: curr.edgeId,
                    strutType: curr.edge.strutType,
                    color: curr.edge.color,
                    centerLen: curr.edge.centerLen,
                    cutLen: curr.edge.cutLen,
                    azimuthDeg: curr.angle,
                    deltaLeftDeg: deltaLeft,
                    deltaRightDeg: deltaRight,
                    miterLeftDeg: miterLeft,
                    miterRightDeg: miterRight
                });
            }

            nodeDetails[node.id] = {
                nodeId: node.id,
                type: node.type,
                nodeTypeCode: node.nodeTypeCode,
                nodeTypeColor: node.nodeTypeColor,
                pitchAngleDeg: node.pitchAngleDeg,
                struts: nodeStruts
            };
        });

        // Warianty kątowe belek (A1, B1, B2...)
        domeEdges.forEach(edge => {
            const n1Strut = nodeDetails[edge.v1].struts.find(s => s.edgeId === edge.id);
            const n2Strut = nodeDetails[edge.v2].struts.find(s => s.edgeId === edge.id);

            const mL1 = n1Strut ? n1Strut.miterLeftDeg : 60.0;
            const mL2 = n2Strut ? n2Strut.miterLeftDeg : 60.0;

            const minAngle = Math.min(mL1, mL2);
            const maxAngle = Math.max(mL1, mL2);

            edge.miterLeftDeg = parseFloat(minAngle.toFixed(1));
            edge.miterRightDeg = parseFloat(maxAngle.toFixed(1));
            edge.angleSig = `${edge.strutType}|L:${edge.miterLeftDeg}|P:${edge.miterRightDeg}`;
        });

        const variantMap = new Map();

        domeEdges.forEach(edge => {
            const sig = edge.angleSig;
            if (!variantMap.has(sig)) {
                variantMap.set(sig, {
                    strutType: edge.strutType,
                    miterLeftDeg: edge.miterLeftDeg,
                    miterRightDeg: edge.miterRightDeg,
                    chordFactor: edge.chordFactor,
                    centerLen: edge.centerLen,
                    cutLen: edge.cutLen,
                    color: edge.color,
                    count: 0,
                    edges: []
                });
            }
            const varInfo = variantMap.get(sig);
            varInfo.count++;
            varInfo.edges.push(edge.id);
        });

        const summaryByStrutVariant = {};
        const variantCounters = {};

        const sortedVariants = Array.from(variantMap.values()).sort((a, b) => {
            if (a.strutType !== b.strutType) return a.strutType.localeCompare(b.strutType);
            return a.miterLeftDeg - b.miterLeftDeg;
        });

        sortedVariants.forEach(v => {
            const baseType = v.strutType;
            variantCounters[baseType] = (variantCounters[baseType] || 0) + 1;
            const subCode = `${baseType}${variantCounters[baseType]}`;

            v.variantCode = subCode;
            summaryByStrutVariant[subCode] = {
                variantCode: subCode,
                baseType: baseType,
                name: `Belka ${subCode}`,
                color: v.color,
                chordFactor: v.chordFactor,
                count: v.count,
                centerLenMm: Math.round(v.centerLen * 1000),
                cutLenMm: Math.round(v.cutLen * 1000),
                miterLeftDeg: v.miterLeftDeg,
                miterRightDeg: v.miterRightDeg,
                totalMeterage: (v.cutLen * v.count).toFixed(2),
                edgeIds: v.edges
            };

            v.edges.forEach(edgeId => {
                domeEdges[edgeId].variantCode = subCode;
            });
        });

        const summaryByStrut = {};
        sortedGroups.forEach(group => {
            const matchingEdges = domeEdges.filter(e => e.strutType === group.type);
            summaryByStrut[group.type] = {
                type: group.type,
                name: group.meta.name,
                color: group.meta.color,
                chordFactor: group.factor,
                count: matchingEdges.length,
                centerLenMm: Math.round(group.factor * radius * 1000),
                cutLenMm: Math.round((group.factor * radius - 2 * pipeRadius) * 1000),
                totalMeterage: ((group.factor * radius - 2 * pipeRadius) * matchingEdges.length).toFixed(2)
            };
        });

        return {
            params,
            radius,
            pipeRadius,
            pipeODMm: params.pipeOD,
            timberWMm: params.timberW,
            timberHMm: params.timberH,
            frequency,
            vertices: domeVertices,
            edges: domeEdges,
            faces: domeFaces,
            uniqueStrutTypes: sortedGroups,
            nodeDetails,
            summaryByStrut,
            summaryByStrutVariant,
            summaryByNodeType
        };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeodesicMath;
} else {
    window.GeodesicMath = GeodesicMath;
}
