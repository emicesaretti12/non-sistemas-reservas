import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { HeroGeometric } from "@/components/ui/hero-geometric";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";
import {
  FeaturesSection,
  StatsSection,
  HowItWorksSection,
  TestimonialsSection,
  PricingSection,
  Footer,
} from "@/components/ui/landing-sections";

export default function Home() {
  return (
    <div className="overflow-x-hidden w-full bg-[#030303]">
      {/* 1. Hero Geometric — First impression */}
      <HeroGeometric
        badge="Non Sistemas"
        title1="Automatizá las reservas,"
        title2="profesionalizá tu negocio."
      />

      {/* 2. Social Proof Stats */}
      <StatsSection />

      {/* 3. Features Grid */}
      <FeaturesSection />

      {/* 4. Cinematic Hero — iPhone Mockup scroll experience */}
      <CinematicHero
        brandName="Non Sistemas"
        tagline1="Gestión inteligente,"
        tagline2="resultados reales."
        cardHeading="Todo en un solo lugar."
        cardDescription={
          <>
            <span className="text-white font-semibold">Non Sistemas</span> automatiza
            reservas, clientes e inventario para que te enfoques en lo que importa:
            hacer crecer tu negocio.
          </>
        }
        metricValue={200}
        metricLabel="Negocios"
        ctaHeading="Empezá hoy."
        ctaDescription="Unite a los negocios que ya automatizan su gestión con Non Sistemas. Configuración en 5 minutos."
      />

      {/* 5. How It Works */}
      <HowItWorksSection />

      {/* 6. Testimonials */}
      <TestimonialsSection />

      {/* 7. Pricing */}
      <PricingSection />

      {/* 8. Gradient CTA — Final conversion */}
      <BackgroundGradientAnimation
        gradientBackgroundStart="rgb(15, 23, 42)"
        gradientBackgroundEnd="rgb(30, 10, 60)"
        firstColor="59, 130, 246"
        secondColor="139, 92, 246"
        thirdColor="34, 211, 238"
        fourthColor="99, 102, 241"
        fifthColor="168, 85, 247"
        pointerColor="99, 102, 241"
        containerClassName="!h-screen !min-h-[100dvh]"
        className="absolute z-50 inset-0 flex items-center justify-center"
      >
        <div className="text-center px-4 max-w-3xl mx-auto w-full">
          <h2 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-4 sm:mb-6 tracking-tight drop-shadow-2xl">
            ¿Listo para crecer?
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-white/60 mb-8 sm:mb-10 max-w-xl mx-auto font-light leading-relaxed">
            Configurá tu negocio en minutos y empezá a recibir reservas automatizadas hoy mismo.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center px-4 sm:px-0">
            <a
              href="#"
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-white text-slate-900 font-semibold rounded-2xl text-base sm:text-lg hover:scale-105 transition-transform shadow-2xl text-center"
            >
              Empezar gratis
            </a>
            <a
              href="#"
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-white/10 text-white font-semibold rounded-2xl text-base sm:text-lg hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm text-center"
            >
              Ver demo
            </a>
          </div>
        </div>
      </BackgroundGradientAnimation>

      {/* 9. Footer */}
      <Footer />
    </div>
  );
}
