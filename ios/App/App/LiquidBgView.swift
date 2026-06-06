import SwiftUI

struct LiquidBgView: View {
    @State private var rotation: Double = 0

    var body: some View {
        ZStack {
            Color(red: 0.02, green: 0.04, blue: 0.1)
                .ignoresSafeArea()

            AngularGradient(
                gradient: Gradient(colors: [
                    Color(red: 0.15, green: 0.4, blue: 0.9),
                    Color(red: 0.6, green: 0.2, blue: 0.8),
                    Color(red: 0.2, green: 0.6, blue: 0.95),
                    Color(red: 0.15, green: 0.4, blue: 0.9)
                ]),
                center: .center,
                angle: .degrees(rotation)
            )
            .opacity(0.45)
            .blur(radius: 80)
            .ignoresSafeArea()
            .onAppear {
                withAnimation(.linear(duration: 24).repeatForever(autoreverses: false)) {
                    rotation = 360
                }
            }
            
            // Ambient frosted glass layer to soften the gradient
            Rectangle()
                .fill(.ultraThinMaterial)
                .opacity(0.6)
                .ignoresSafeArea()
        }
    }
}

