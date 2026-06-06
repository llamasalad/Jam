import SwiftUI

/// A Metal-accelerated fluid gradient background view.
/// On iOS 18+ uses native MeshGradient; on earlier versions uses blurred animated circles.
struct LiquidBgView: View {
    @State private var animationPhase: CGFloat = 0

    var body: some View {
        TimelineView(.animation(minimumInterval: 1.0 / 30.0)) { timeline in
            let t = timeline.date.timeIntervalSinceReferenceDate
            Canvas { context, size in
                drawBlobs(context: context, size: size, time: t)
            }
        }
        .background(Color(red: 0.02, green: 0.02, blue: 0.035))
        .ignoresSafeArea()
    }

    private func drawBlobs(context: GraphicsContext, size: CGSize, time: TimeInterval) {
        let w = size.width
        let h = size.height

        // Blob 1 — Purple
        let x1 = w * (0.3 + 0.2 * sin(time * 0.08))
        let y1 = h * (0.25 + 0.15 * cos(time * 0.06))
        let r1 = min(w, h) * 0.45
        drawBlob(context: context, center: CGPoint(x: x1, y: y1), radius: r1,
                 color: Color(red: 0.66, green: 0.33, blue: 0.97).opacity(0.35))

        // Blob 2 — Blue
        let x2 = w * (0.7 + 0.2 * cos(time * 0.07))
        let y2 = h * (0.7 + 0.15 * sin(time * 0.09))
        let r2 = min(w, h) * 0.5
        drawBlob(context: context, center: CGPoint(x: x2, y: y2), radius: r2,
                 color: Color(red: 0.23, green: 0.51, blue: 0.96).opacity(0.30))

        // Blob 3 — Pink
        let x3 = w * (0.5 + 0.25 * sin(time * 0.1 + 2.0))
        let y3 = h * (0.5 + 0.2 * cos(time * 0.05 + 1.0))
        let r3 = min(w, h) * 0.4
        drawBlob(context: context, center: CGPoint(x: x3, y: y3), radius: r3,
                 color: Color(red: 0.93, green: 0.28, blue: 0.60).opacity(0.28))
    }

    private func drawBlob(context: GraphicsContext, center: CGPoint, radius: CGFloat, color: Color) {
        var ctx = context
        ctx.addFilter(.blur(radius: radius * 0.6))
        let rect = CGRect(x: center.x - radius, y: center.y - radius,
                         width: radius * 2, height: radius * 2)
        ctx.fill(Ellipse().path(in: rect), with: .color(color))
    }
}

