import { BackgroundGradientAnimation } from "@/components/ui/background-gradient-animation";
import { HeroGeometric } from "@/components/ui/hero-geometric";
import { CinematicHero } from "@/components/ui/cinematic-landing-hero";

export default function Home() {
  return (
    <div className="overflow-x-hidden w-full">
      {/* Section 1: Geometric Hero */}
      <HeroGeometric
        badge="Non Sistemas"
        title1="Automatizá las reservas,"
        title2="profesionalizá tu negocio."
      />

      {/* Section 2: Cinematic Hero with iPhone Mockup */}
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

      {/* Section 3: Gradient Background CTA */}
      <BackgroundGradientAnimation
        gradientBackgroundStart="rgb(15, 23, 42)"
        gradientBackgroundEnd="rgb(30, 10, 60)"
        firstColor="59, 130, 246"
        secondColor="139, 92, 246"
        thirdColor="34, 211, 238"
        fourthColor="99, 102, 241"
        fifthColor="168, 85, 247"
        pointerColor="99, 102, 241"
        containerClassName="!h-screen"
        className="absolute z-50 inset-0 flex items-center justify-center"
      >
        <div className="text-center px-4 max-w-3xl mx-auto">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-bold text-white mb-6 tracking-tight drop-shadow-2xl">
            ¿Listo para crecer?
          </h2>
          <p className="text-lg md:text-xl text-white/60 mb-10 max-w-xl mx-auto font-light leading-relaxed">
            Configurá tu negocio en minutos y empezá a recibir reservas automatizadas hoy mismo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="#"
              className="px-8 py-4 bg-white text-slate-900 font-semibold rounded-2xl text-lg hover:scale-105 transition-transform shadow-2xl"
            >
              Empezar gratis
            </a>
            <a
              href="#"
              className="px-8 py-4 bg-white/10 text-white font-semibold rounded-2xl text-lg hover:bg-white/20 transition-colors border border-white/20 backdrop-blur-sm"
            >
              Ver demo
            </a>
          </div>
        </div>
      </BackgroundGradientAnimation>
    </div>
  );
}
