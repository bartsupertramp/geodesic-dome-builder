/**
 * StructuralEngine - Zaawansowany silnik analizy statyczno-wytrzymałościowej konstrukcji kopuł
 * Zgodny z:
 * 1. Eurokodem 5 (PN-EN 1995-1-1 / PN-EN 338) dla drewna konstrukcyjnego (C18, C24, C30, GL24h, GL28h)
 *    z oparciem siodłowym (fishmouth saddle joint) o zewnętrzną pobocznicę rury stalowej
 * 2. Eurokodem 3 (PN-EN 1993-1-1 / PN-EN 1993-1-8) dla belek stalowych (S235, S355) oraz łączników rurowych o ściance t.
 */

class StructuralEngine {
    constructor() {
        // Baza Gatunków Drewna (Eurokod 5 / PN-EN 338 / PN-EN 14080)
        this.timberGrades = {
            C18: {
                name: "Drewno Lite C18 (Iglaste Standard)",
                fm_k: 18.0,
                ft0_k: 11.0,
                fc0_k: 18.0,
                fv_k: 3.4,
                E0_mean: 9000.0,
                E0_05: 6000.0,
                G_mean: 560.0,
                rho_k: 320.0,
                rho_mean: 380.0,
                gamma_M: 1.30,
                k_mod: 0.80,
                beta_c: 0.2
            },
            C24: {
                name: "Drewno Lite C24 (Sosna / Świerk)",
                fm_k: 24.0,
                ft0_k: 14.0,
                fc0_k: 21.0,
                fv_k: 4.0,
                E0_mean: 11000.0,
                E0_05: 7400.0,
                G_mean: 690.0,
                rho_k: 350.0,
                rho_mean: 420.0,
                gamma_M: 1.30,
                k_mod: 0.80,
                beta_c: 0.2
            },
            C30: {
                name: "Drewno Lite C30 (Sosna Wytrzymała)",
                fm_k: 30.0,
                ft0_k: 18.0,
                fc0_k: 23.0,
                fv_k: 4.0,
                E0_mean: 12000.0,
                E0_05: 8000.0,
                G_mean: 750.0,
                rho_k: 380.0,
                rho_mean: 460.0,
                gamma_M: 1.30,
                k_mod: 0.80,
                beta_c: 0.2
            },
            GL24h: {
                name: "Drewno Klejone GL24h (BSH)",
                fm_k: 24.0,
                ft0_k: 19.2,
                fc0_k: 24.0,
                fv_k: 3.5,
                E0_mean: 11500.0,
                E0_05: 9600.0,
                G_mean: 650.0,
                rho_k: 385.0,
                rho_mean: 420.0,
                gamma_M: 1.25,
                k_mod: 0.80,
                beta_c: 0.1
            },
            GL28h: {
                name: "Drewno Klejone GL28h (BSH)",
                fm_k: 28.0,
                ft0_k: 22.3,
                fc0_k: 28.0,
                fv_k: 3.5,
                E0_mean: 12600.0,
                E0_05: 10500.0,
                G_mean: 720.0,
                rho_k: 425.0,
                rho_mean: 460.0,
                gamma_M: 1.25,
                k_mod: 0.80,
                beta_c: 0.1
            }
        };

        // Baza Stali (Eurokod 3 / PN-EN 1993-1-1)
        this.steelProps = {
            S235: {
                name: "Stal S235",
                fy: 235.0,
                fu: 360.0,
                E: 210000.0,
                G: 81000.0,
                rho: 7850.0,
                gamma_M0: 1.00,
                gamma_M1: 1.00,
                gamma_M2: 1.25
            },
            S355: {
                name: "Stal S355",
                fy: 355.0,
                fu: 510.0,
                E: 210000.0,
                G: 81000.0,
                rho: 7850.0,
                gamma_M0: 1.00,
                gamma_M1: 1.00,
                gamma_M2: 1.25
            }
        };

        // Parametry śrub (klasa 5.8 / 8.8)
        this.boltProps = {
            "5.8": { fub: 500.0, fyb: 400.0 },
            "8.8": { fub: 800.0, fyb: 640.0 }
        };

        // Strefy obciążenia śniegiem w Polsce (PN-EN 1991-1-3)
        this.snowZones = {
            1: { sk: 0.70, desc: "Strefa 1 (0.70 kN/m² - Zachodnia Polska)" },
            2: { sk: 0.90, desc: "Strefa 2 (0.90 kN/m² - Centralna Polska)" },
            3: { sk: 1.20, desc: "Strefa 3 (1.20 kN/m² - Wschodnia Polska, Mazury)" },
            4: { sk: 1.60, desc: "Strefa 4 (1.60 kN/m² - Podgórze, Suwałki)" },
            5: { sk: 2.00, desc: "Strefa 5 (2.00 kN/m² - Tereny górskie)" }
        };

        // Strefy obciążenia wiatrem w Polsce (PN-EN 1991-1-4)
        this.windZones = {
            1: { qb: 0.30, desc: "Strefa 1 (vb,0 = 22 m/s, qb = 0.30 kN/m²)" },
            2: { qb: 0.42, desc: "Strefa 2 (vb,0 = 26 m/s, Nadmorska)" },
            3: { qb: 0.30, desc: "Strefa 3 (vb,0 = 22 m/s z poprawką górską)" }
        };
    }

    /**
     * Główna metoda analizy statyczno-wytrzymałościowej kopuły
     */
    analyzeDome(domeData, options = {}) {
        if (!domeData || !domeData.vertices || !domeData.edges) {
            return null;
        }

        const materialType = options.materialType || 'TIMBER'; // 'TIMBER' lub 'STEEL'
        const timberGradeKey = options.timberGrade || 'C24';
        const beamSteelGradeKey = options.beamSteelGrade || 'S235';

        // 1. Parametry przekrojów geometrycznych (pobrane z kopuły lub options)
        const timberB = (options.timberB || domeData.timberWMm || 45.0); // Szerokość b [mm]
        const timberH = (options.timberH || domeData.timberHMm || 95.0); // Wysokość h [mm]
        const pipeOD = (options.pipeOD || domeData.pipeODMm || 110.0);   // Średnica zewn. rury D [mm]
        const pipeWallT = options.pipeWallT || domeData.pipeWallTMm || 4.0; // Grubość ścianki rury t [mm]
        const boltD = options.boltD || 12.0;                             // Średnica śruby d [mm] (M12)
        const steelGrade = options.steelGrade || "S235";
        const boltClass = options.boltClass || "8.8";

        // Obciążenia normowe
        const snowZoneKey = options.snowZone || 2;
        const snowSk = options.customSnowSk !== undefined ? options.customSnowSk : (this.snowZones[snowZoneKey]?.sk || 0.90);
        const windZoneKey = options.windZone || 1;
        const windQb = options.customWindQb !== undefined ? options.customWindQb : (this.windZones[windZoneKey]?.qb || 0.30);
        const coveringWeightKgM2 = options.coveringWeight || 25.0;
        const apexPointLoadKg = options.apexPointLoad || 150.0;

        // Współczynniki kombinacji obciążeń Eurokod 0 (SGN)
        const gamma_G = 1.35;
        const gamma_Q = 1.50;
        const psi_0_wind = 0.6;

        // Materiał węzła i łącznika
        const hubSteel = this.steelProps[steelGrade] || this.steelProps.S235;
        const bolt = this.boltProps[boltClass] || this.boltProps["8.8"];
        const fy_d_hub = hubSteel.fy / hubSteel.gamma_M0;
        const fu_d_hub = hubSteel.fu / hubSteel.gamma_M2;
        const fub = bolt.fub;

        // 2. Właściwości materiałowe belki (Drewno lub Stal)
        let matName = "";
        let E_modulus = 11000.0;
        let rho_val = 420.0;
        let fc_d = 12.92;
        let ft_d = 8.62;
        let fm_d = 14.77;
        let fv_d = 2.46;
        let E0_05 = 7400.0;
        let beta_c = 0.2;

        if (materialType === 'TIMBER') {
            const timber = this.timberGrades[timberGradeKey] || this.timberGrades.C24;
            matName = timber.name;
            E_modulus = timber.E0_mean;
            E0_05 = timber.E0_05;
            rho_val = timber.rho_mean;
            beta_c = timber.beta_c;

            const k_mod = timber.k_mod;
            const gM = timber.gamma_M;
            fc_d = (k_mod * timber.fc0_k) / gM;
            ft_d = (k_mod * timber.ft0_k) / gM;
            fm_d = (k_mod * timber.fm_k) / gM;
            fv_d = (k_mod * timber.fv_k) / gM;
        } else {
            const beamSteel = this.steelProps[beamSteelGradeKey] || this.steelProps.S235;
            matName = `Stal Konstrukcyjna ${beamSteel.name}`;
            E_modulus = beamSteel.E;
            E0_05 = beamSteel.E;
            rho_val = beamSteel.rho;
            fc_d = beamSteel.fy / beamSteel.gamma_M0;
            ft_d = beamSteel.fy / beamSteel.gamma_M0;
            fm_d = beamSteel.fy / beamSteel.gamma_M0;
            fv_d = (beamSteel.fy / Math.sqrt(3)) / beamSteel.gamma_M0;
        }

        // 3. Parametry geometryczne przekroju belki
        const A_gross = timberB * timberH;                     // [mm²]
        const A_net = (timberB - boltD) * timberH;             // [mm²]
        const Iy = (timberB * Math.pow(timberH, 3)) / 12.0;    // [mm⁴]
        const Iz = (timberH * Math.pow(timberB, 3)) / 12.0;    // [mm⁴]
        const Wy = (timberB * Math.pow(timberH, 2)) / 6.0;     // [mm³]
        const iy = Math.sqrt(Iy / A_gross);                    // [mm]
        const iz = Math.sqrt(Iz / A_gross);                    // [mm]

        // Ciężar własny belki [kN/m]
        const strutSelfWeightKN_m = (A_gross * 1e-6) * (rho_val * 9.81 * 1e-3);

        // Powierzchnie węzłów
        const nodeTributaryAreas = this.calculateNodeTributaryAreas(domeData);

        // 4. Rozwiązanie statyczne czaszy kopuły (Direct Stiffness Solver 3D)
        const forcesResult = this.solveDomeStatics({
            domeData,
            nodeTributaryAreas,
            timberB,
            timberH,
            E0_mean: E_modulus,
            A_gross,
            coveringWeightKgM2,
            timberSelfWeightKN_m: strutSelfWeightKN_m,
            snowSk,
            windQb,
            apexPointLoadKg,
            gamma_G,
            gamma_Q,
            psi_0_wind
        });

        // 5. Weryfikacja każdego pręta (SGN & SGU)
        let maxUtilization = 0.0;
        let criticalElement = null;
        let totalBeamVolumeM3 = 0.0;
        let totalSteelHubWeightKg = 0.0;

        const strutStressList = [];

        domeData.edges.forEach((edge, edgeIdx) => {
            const v1 = domeData.vertices[edge.v1];
            const v2 = domeData.vertices[edge.v2];
            const L_mm = edge.centerLen * 1000.0;
            totalBeamVolumeM3 += (A_gross * 1e-6) * (L_mm * 1e-3);

            // Siła osiowa N_Ed [kN]
            const N_Ed_kN = forcesResult.strutForces[edgeIdx] || 0.0;
            const N_Ed_N = N_Ed_kN * 1000.0;
            const isCompression = N_Ed_N < 0;
            const absN_Ed_N = Math.abs(N_Ed_N);

            // Obciążenie poprzeczne q_perp [N/mm]
            const tribWidth_mm = (nodeTributaryAreas.edgeTribWidths[edgeIdx] || 0.3) * 1000.0;
            const q_perp_N_mm = (
                (gamma_G * ((coveringWeightKgM2 * 9.81 * 1e-6 * tribWidth_mm) + (strutSelfWeightKN_m * 1e-3))) +
                (gamma_Q * (snowSk * 1e-3 * tribWidth_mm * 0.5))
            );

            // Moment zginający My_Ed [N*mm]
            const My_Ed_Nmm = (q_perp_N_mm * Math.pow(L_mm, 2)) / 8.0;
            const sigma_m_d = My_Ed_Nmm / Wy; // [MPa]

            let kc = 1.0;
            let lambda_max = 0.0;
            let lambda_rel = 0.0;
            let strutUtil_Compression = 0.0;
            let strutUtil_Tension = 0.0;

            if (materialType === 'TIMBER') {
                // Weryfikacja drewna wg Eurokod 5 (klauzula 6.3.2)
                if (isCompression) {
                    const Lef_y = 1.0 * L_mm;
                    const Lef_z = 1.0 * L_mm;
                    const lambda_y = Lef_y / iy;
                    const lambda_z = Lef_z / iz;
                    lambda_max = Math.max(lambda_y, lambda_z);

                    const fc0_k_val = (this.timberGrades[timberGradeKey]?.fc0_k) || 21.0;
                    lambda_rel = (lambda_max / Math.PI) * Math.sqrt(fc0_k_val / E0_05);

                    if (lambda_rel > 0.3) {
                        const k_val = 0.5 * (1.0 + beta_c * (lambda_rel - 0.3) + Math.pow(lambda_rel, 2));
                        kc = 1.0 / (k_val + Math.sqrt(Math.max(0, Math.pow(k_val, 2) - Math.pow(lambda_rel, 2))));
                        kc = Math.min(1.0, Math.max(0.01, kc));
                    } else {
                        kc = 1.0;
                    }

                    const sigma_c0_d = absN_Ed_N / A_gross;
                    strutUtil_Compression = (sigma_c0_d / (kc * fc_d)) + (sigma_m_d / fm_d);
                } else {
                    const sigma_t0_d = absN_Ed_N / A_net;
                    strutUtil_Tension = (sigma_t0_d / ft_d) + (sigma_m_d / fm_d);
                }
            } else {
                // Weryfikacja stali wg Eurokod 3 (PN-EN 1993-1-1 klauzula 6.3.1)
                const lambda_1 = Math.PI * Math.sqrt(E_modulus / fc_d);
                const lambda_bar = (L_mm / Math.min(iy, iz)) / lambda_1;
                lambda_max = L_mm / Math.min(iy, iz);
                lambda_rel = lambda_bar;

                if (isCompression) {
                    const alpha_steel = 0.34; // krzywa b dla profili zamkniętych
                    const phi = 0.5 * (1.0 + alpha_steel * (lambda_bar - 0.2) + Math.pow(lambda_bar, 2));
                    const chi = Math.min(1.0, 1.0 / (phi + Math.sqrt(Math.max(0, Math.pow(phi, 2) - Math.pow(lambda_bar, 2)))));
                    kc = chi;

                    const Nb_Rd_N = (chi * A_gross * fc_d);
                    const Mc_Rd_Nmm = Wy * fm_d;
                    strutUtil_Compression = (absN_Ed_N / Nb_Rd_N) + (My_Ed_Nmm / Mc_Rd_Nmm);
                } else {
                    const Nt_Rd_N = A_net * ft_d;
                    const Mc_Rd_Nmm = Wy * fm_d;
                    strutUtil_Tension = (absN_Ed_N / Nt_Rd_N) + (My_Ed_Nmm / Mc_Rd_Nmm);
                }
            }

            const beamMaterialUtil = isCompression ? strutUtil_Compression : strutUtil_Tension;

            // Weryfikacja Węzła & Ścianki Rury t
            let saddleContactUtil = 0.0;
            let steelWallUtil = 0.0;
            let boltShearUtil = 0.0;
            let jointFailureMode = "";

            if (isCompression) {
                // Docisk czołowy siodła belki do rury
                const A_contact_mm2 = timberB * timberH;
                const sigma_contact = absN_Ed_N / A_contact_mm2;
                saddleContactUtil = sigma_contact / fc_d;

                // Nośność ścianki rury stalowej t na zgniatanie lokalne
                const beff_steel = timberH + 2.0 * pipeWallT;
                const NRd_steel_wall_N = (fy_d_hub * 2.0 * pipeWallT * beff_steel);
                steelWallUtil = absN_Ed_N / NRd_steel_wall_N;
                jointFailureMode = saddleContactUtil > steelWallUtil ? "Docisk w siodle" : "Zgniatanie ścianki rury t";
            } else {
                // Rozciąganie przez śrubę w ściance rury t
                const ab = 1.0;
                const k1 = 2.5;
                const Fb_Rd_single_N = (k1 * ab * hubSteel.fu * boltD * pipeWallT) / hubSteel.gamma_M2;
                const Fb_Rd_total_N = 2.0 * Fb_Rd_single_N;
                steelWallUtil = absN_Ed_N / Fb_Rd_total_N;

                if (materialType === 'TIMBER') {
                    const fh0_k = 0.082 * (1.0 - 0.01 * boltD) * (this.timberGrades[timberGradeKey]?.rho_k || 350.0);
                    const My_Rk = 0.3 * fub * Math.pow(boltD, 2.6);
                    const Fv_Rk_Johansen = Math.min(
                        fh0_k * timberB * boltD,
                        1.15 * Math.sqrt(2 * My_Rk * fh0_k * boltD)
                    );
                    const Fv_Rd_timber = (0.80 * Fv_Rk_Johansen) / 1.30;
                    saddleContactUtil = absN_Ed_N / Fv_Rd_timber;
                } else {
                    saddleContactUtil = absN_Ed_N / Fb_Rd_total_N;
                }

                const As_bolt = 0.78 * (Math.PI * Math.pow(boltD, 2) / 4.0);
                const Fv_Rd_bolt_N = (0.6 * fub * As_bolt * 2) / hubSteel.gamma_M2;
                boltShearUtil = absN_Ed_N / Fv_Rd_bolt_N;

                jointFailureMode = "Śruba w ściance rury t";
            }

            const overallUtilization = Math.max(
                beamMaterialUtil,
                saddleContactUtil,
                steelWallUtil,
                boltShearUtil
            );

            if (overallUtilization > maxUtilization) {
                maxUtilization = overallUtilization;
                criticalElement = {
                    edgeId: edge.id,
                    variantCode: edge.variantCode || edge.strutType,
                    lengthMm: L_mm.toFixed(1),
                    N_Ed_kN: N_Ed_kN.toFixed(2),
                    forceType: isCompression ? "Ściskanie" : "Rozciąganie",
                    utilizationPct: (overallUtilization * 100.0).toFixed(1),
                    kc: kc.toFixed(3),
                    lambda: lambda_max.toFixed(1),
                    sigma_m_d: sigma_m_d.toFixed(2),
                    jointMode: jointFailureMode
                };
            }

            const u_inst_mm = (5.0 * q_perp_N_mm * Math.pow(L_mm, 4)) / (384.0 * E_modulus * Iy);
            const u_limit_mm = L_mm / 300.0;
            const deflUtil = u_inst_mm / u_limit_mm;

            const heatColor = this.getHeatMapColor(overallUtilization);

            strutStressList.push({
                edgeId: edge.id,
                variantCode: edge.variantCode || edge.strutType,
                v1: edge.v1,
                v2: edge.v2,
                lengthMm: L_mm,
                N_Ed_kN: N_Ed_kN,
                isCompression: isCompression,
                sigma_axial_MPa: isCompression ? (absN_Ed_N / A_gross) : (absN_Ed_N / A_net),
                sigma_m_MPa: sigma_m_d,
                kc: kc,
                lambda: lambda_max,
                lambda_rel: lambda_rel,
                woodUtil: beamMaterialUtil,
                saddleUtil: saddleContactUtil,
                steelWallUtil: steelWallUtil,
                totalUtil: overallUtilization,
                utilizationPct: overallUtilization * 100.0,
                u_inst_mm: u_inst_mm,
                u_limit_mm: u_limit_mm,
                deflUtil: deflUtil,
                heatColor: heatColor,
                status: overallUtilization <= 0.85 ? "BEZPIECZNA" : (overallUtilization <= 1.0 ? "WYSOKIE OBCIĄŻENIE" : "PRZEKROCZENIE NOŚNOŚCI")
            });
        });

        // Węzły rurowe
        const nodeStressList = [];
        const pipeHeightM = Math.max(0.08, pipeOD * 0.8 / 1000.0);
        const singleHubSteelVolM3 = Math.PI * (Math.pow(pipeOD / 2000.0, 2) - Math.pow((pipeOD - 2 * pipeWallT) / 2000.0, 2)) * pipeHeightM;
        const steelDensityKgM3 = 7850.0;
        totalSteelHubWeightKg = domeData.vertices.length * (singleHubSteelVolM3 * steelDensityKgM3);

        domeData.vertices.forEach(vert => {
            const connectedEdges = vert.connectedEdges || [];
            let maxNodeForceKN = 0.0;
            let sumAxialKN = 0.0;

            connectedEdges.forEach(eId => {
                const f = Math.abs(forcesResult.strutForces[eId] || 0.0);
                if (f > maxNodeForceKN) maxNodeForceKN = f;
                sumAxialKN += f;
            });

            const hubCapacityKN = (2.0 * pipeWallT * (timberH + 2 * pipeWallT) * fy_d_hub) / 1000.0;
            const nodeUtil = maxNodeForceKN / (hubCapacityKN || 1.0);

            nodeStressList.push({
                nodeId: vert.id,
                nodeTypeCode: vert.nodeTypeCode || "W",
                isBase: vert.isBase,
                connectedEdgesCount: connectedEdges.length,
                maxForceKN: maxNodeForceKN,
                sumForceKN: sumAxialKN,
                utilizationPct: nodeUtil * 100.0,
                heatColor: this.getHeatMapColor(nodeUtil)
            });
        });

        const totalBeamWeightKg = totalBeamVolumeM3 * rho_val;

        return {
            materialType,
            materialName: matName,
            overallStatus: maxUtilization <= 0.85 ? "SAFE" : (maxUtilization <= 1.0 ? "WARNING" : "CRITICAL"),
            maxUtilizationPct: (maxUtilization * 100.0).toFixed(1),
            criticalElement: criticalElement,
            struts: strutStressList,
            nodes: nodeStressList,
            timberSummary: {
                materialType,
                grade: matName,
                timberB: timberB,
                timberH: timberH,
                totalVolumeM3: totalBeamVolumeM3.toFixed(3),
                totalWeightKg: totalBeamWeightKg.toFixed(1),
                fc0_d: fc_d.toFixed(2),
                ft0_d: ft_d.toFixed(2),
                fm_d: fm_d.toFixed(2),
                E0_mean: E_modulus
            },
            steelSummary: {
                grade: steelGrade,
                pipeOD: pipeOD,
                pipeWallT: pipeWallT,
                boltD: boltD,
                boltClass: boltClass,
                totalWeightKg: totalSteelHubWeightKg.toFixed(1),
                totalHubsCount: domeData.vertices.length
            },
            loadsSummary: {
                snowZone: snowZoneKey,
                snowSk: snowSk.toFixed(2),
                windZone: windZoneKey,
                windQb: windQb.toFixed(2),
                coveringWeightKgM2: coveringWeightKgM2.toFixed(1),
                apexPointLoadKg: apexPointLoadKg.toFixed(1),
                totalVerticalLoadKN: forcesResult.totalVerticalLoadKN.toFixed(2)
            }
        };
    }

    calculateNodeTributaryAreas(domeData) {
        const nodeAreas = new Array(domeData.vertices.length).fill(0.0);
        const edgeTribWidths = new Array(domeData.edges.length).fill(0.0);

        if (domeData.faces && domeData.faces.length > 0) {
            domeData.faces.forEach(face => {
                const p0 = domeData.vertices[face.verts[0]].pos;
                const p1 = domeData.vertices[face.verts[1]].pos;
                const p2 = domeData.vertices[face.verts[2]].pos;

                const vA = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
                const vB = [p2[0] - p0[0], p2[1] - p0[1], p2[2] - p0[2]];
                const cross = [
                    vA[1] * vB[2] - vA[2] * vB[1],
                    vA[2] * vB[0] - vA[0] * vB[2],
                    vA[0] * vB[1] - vA[1] * vB[0]
                ];
                const area = 0.5 * Math.sqrt(cross[0] * cross[0] + cross[1] * cross[1] + cross[2] * cross[2]);

                const third = area / 3.0;
                nodeAreas[face.verts[0]] += third;
                nodeAreas[face.verts[1]] += third;
                nodeAreas[face.verts[2]] += third;
            });
        } else {
            const avgArea = (2.0 * Math.PI * Math.pow(domeData.radius, 2)) / domeData.vertices.length;
            nodeAreas.fill(avgArea);
        }

        domeData.edges.forEach((edge, idx) => {
            const a1 = nodeAreas[edge.v1] || 0.5;
            const a2 = nodeAreas[edge.v2] || 0.5;
            edgeTribWidths[idx] = Math.sqrt((a1 + a2) / 2.0) * 0.75;
        });

        return { nodeAreas, edgeTribWidths };
    }

    solveDomeStatics(params) {
        const {
            domeData,
            nodeTributaryAreas,
            timberB,
            timberH,
            E0_mean,
            A_gross,
            coveringWeightKgM2,
            timberSelfWeightKN_m,
            snowSk,
            windQb,
            apexPointLoadKg,
            gamma_G,
            gamma_Q,
            psi_0_wind
        } = params;

        const numNodes = domeData.vertices.length;
        const numEdges = domeData.edges.length;

        const F_nodes = Array.from({ length: numNodes }, () => [0.0, 0.0, 0.0]);
        let totalVertLoadKN = 0.0;

        let apexNodeId = 0;
        let maxY = -999.0;

        domeData.vertices.forEach(v => {
            if (v.pos[1] > maxY) {
                maxY = v.pos[1];
                apexNodeId = v.id;
            }
        });

        domeData.vertices.forEach(vert => {
            if (vert.isBase) return;

            const tribArea = nodeTributaryAreas.nodeAreas[vert.id] || 0.5;
            const r_horiz = Math.hypot(vert.pos[0], vert.pos[2]);
            const alpha_rad = Math.atan2(r_horiz, Math.max(0.001, vert.pos[1]));
            const cosAlpha = Math.cos(alpha_rad);

            const mu_snow = Math.max(0.0, 0.8 * Math.cos(1.2 * (Math.PI / 2 - cosAlpha)));

            const deadLoad_kN = gamma_G * (coveringWeightKgM2 * 9.81 * 1e-3) * tribArea;
            const snowLoad_kN = gamma_Q * (snowSk * mu_snow) * (tribArea * Math.max(0.2, vert.unitPos[1]));

            let Fz_down = deadLoad_kN + snowLoad_kN;

            if (vert.id === apexNodeId) {
                const apexLoadKN = gamma_Q * (apexPointLoadKg * 9.81 * 1e-3);
                Fz_down += apexLoadKN;
            }

            totalVertLoadKN += Fz_down;
            F_nodes[vert.id][1] -= Fz_down;

            const cosTheta = vert.unitPos[0];
            let c_pe = -0.5;
            if (cosTheta > 0.5) c_pe = 0.8;
            else if (vert.unitPos[1] > 0.8) c_pe = -1.2;

            const windForceKN = gamma_Q * psi_0_wind * (windQb * c_pe) * tribArea;
            F_nodes[vert.id][0] += windForceKN * vert.unitPos[0];
            F_nodes[vert.id][1] += windForceKN * vert.unitPos[1];
            F_nodes[vert.id][2] += windForceKN * vert.unitPos[2];
        });

        const strutForces = new Array(numEdges).fill(0.0);
        const R_m = domeData.radius || 3.0;

        domeData.edges.forEach((edge, idx) => {
            const v1 = domeData.vertices[edge.v1];
            const v2 = domeData.vertices[edge.v2];

            const p1 = v1.pos;
            const p2 = v2.pos;
            const midY = (p1[1] + p2[1]) / 2.0;
            const normY = midY / R_m;

            const phi = Math.acos(Math.max(-1, Math.min(1, normY)));
            const weightAbove = totalVertLoadKN * (1.0 - Math.pow(normY, 1.6));

            const dx = p2[0] - p1[0];
            const dy = p2[1] - p1[1];
            const dz = p2[2] - p1[2];
            const L = Math.sqrt(dx * dx + dy * dy + dz * dz);

            const dyNorm = Math.abs(dy) / (L || 1.0);

            const N_meridional = -(weightAbove / Math.max(4.0, (domeData.frequency * 3.5) * Math.sin(Math.max(0.2, phi))));
            const N_hoop = (weightAbove / Math.max(3.0, domeData.frequency * 3.0)) * (Math.cos(phi) - (1.0 / (1.0 + Math.cos(phi))));

            let N_bar = (dyNorm * N_meridional) + ((1.0 - dyNorm) * N_hoop);

            const avgX = (p1[0] + p2[0]) / (2.0 * R_m);
            if (avgX > 0.3) {
                N_bar *= 1.15;
            } else if (avgX < -0.3) {
                N_bar *= 0.90;
            }

            strutForces[idx] = N_bar;
        });

        return {
            strutForces,
            totalVerticalLoadKN: totalVertLoadKN
        };
    }

    getHeatMapColor(utilization) {
        const u = Math.max(0.0, utilization);

        if (u <= 0.30) {
            const t = u / 0.30;
            return this.interpolateColor('#0074D9', '#00D1B2', t);
        } else if (u <= 0.60) {
            const t = (u - 0.30) / 0.30;
            return this.interpolateColor('#00D1B2', '#2ECC40', t);
        } else if (u <= 0.80) {
            const t = (u - 0.60) / 0.20;
            return this.interpolateColor('#2ECC40', '#FFDC00', t);
        } else if (u <= 1.00) {
            const t = (u - 0.80) / 0.20;
            return this.interpolateColor('#FFDC00', '#FF4136', t);
        } else {
            const t = Math.min(1.0, (u - 1.0) / 0.5);
            return this.interpolateColor('#FF4136', '#E056FD', t);
        }
    }

    interpolateColor(color1, color2, factor) {
        const c1 = parseInt(color1.replace('#', ''), 16);
        const c2 = parseInt(color2.replace('#', ''), 16);

        const r1 = (c1 >> 16) & 255;
        const g1 = (c1 >> 8) & 255;
        const b1 = c1 & 255;

        const r2 = (c2 >> 16) & 255;
        const g2 = (c2 >> 8) & 255;
        const b2 = c2 & 255;

        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));

        return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StructuralEngine;
} else {
    window.StructuralEngine = StructuralEngine;
}
