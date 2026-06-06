import SwiftUI

struct LiquidBgView: View {
    @State private var phase: Double = 0

    var body: some View {
        ZStack {
            // Base colour — keeps dark corners fully opaque
            Color(red: 0.02, green: 0.03, blue: 0.08)
                .ignoresSafeArea()

            // Animated mesh gradient — iOS 18+ / 26
            MeshGradient(width: 3, height: 3, points: meshPoints, colors: meshColors)
                .blur(radius: 18)
                .opacity(0.92)
                .ignoresSafeArea()
                .onAppear {
                    withAnimation(.easeInOut(duration: 20).repeatForever(autoreverses: true)) {
                        phase = 1.0
                    }
                }

            // Dark vignette for depth — replaces ultraThinMaterial
            // Keeps vivid colour in the centre while grounding the edges,
            // without the grey/white tint that material adds.
            RadialGradient(
                colors: [.clear, Color.black.opacity(0.6)],
                center: .center,
                startRadius: 140,
                endRadius: 520
            )
            .ignoresSafeArea()
        }
    }

    // MARK: - Animated mesh points
    // Corner points stay fixed; interior/edge points drift gently so the
    // gradient flows rather than spins.
    private var meshPoints: [SIMD2<Float>] {
        let p = Float(phase)
        return [
            // Row 0 — top edge
            [0.0, 0.0],
            [0.5 + 0.08 * sin(p * .pi * 1.1), 0.0],
            [1.0, 0.0],
            // Row 1 — middle
            [0.0, 0.5 + 0.10 * sin(p * .pi * 0.7)],
            [0.5 + 0.14 * sin(p * .pi * 1.3), 0.5 + 0.10 * cos(p * .pi * 0.9)],
            [1.0, 0.5 + 0.08 * cos(p * .pi * 1.2)],
            // Row 2 — bottom edge
            [0.0, 1.0],
            [0.5 + 0.09 * cos(p * .pi * 0.8), 1.0],
            [1.0, 1.0],
        ]
    }

    // MARK: - Mesh colours
    // Deep navy anchors at the corners; saturated blue-indigo-violet in the
    // centre and edges to catch the glass refraction above it.
    private var meshColors: [Color] {
        [
            Color(red: 0.03, green: 0.05, blue: 0.16),  // TL
            Color(red: 0.10, green: 0.32, blue: 0.88),  // TC
            Color(red: 0.48, green: 0.10, blue: 0.72),  // TR
            Color(red: 0.07, green: 0.22, blue: 0.72),  // ML
            Color(red: 0.22, green: 0.06, blue: 0.52),  // MC
            Color(red: 0.10, green: 0.44, blue: 0.90),  // MR
            Color(red: 0.02, green: 0.04, blue: 0.12),  // BL
            Color(red: 0.14, green: 0.34, blue: 0.82),  // BC
            Color(red: 0.04, green: 0.06, blue: 0.18),  // BR
        ]
    }
}