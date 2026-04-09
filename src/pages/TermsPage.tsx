import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-white py-20 px-4 font-sans selection:bg-black selection:text-white">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 font-black uppercase text-sm hover:text-red-600 transition-colors mb-12 min-h-[44px]"
        >
          <ArrowLeft size={16} /> Späť
        </button>

        <h1 className="text-4xl md:text-6xl font-black uppercase mb-8 leading-none">
          Obchodné <span className="text-red-600">podmienky</span>
        </h1>

        <div className="border-l-4 border-black pl-4 mb-8 font-bold text-sm text-gray-500 uppercase">
          Posledná aktualizácia: 9. apríl 2026
        </div>

        <div className="space-y-8 font-bold text-gray-800 leading-relaxed">
          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">1. Všeobecné ustanovenia</h2>
            <p>
              Tieto obchodné podmienky upravujú práva a povinnosti medzi prevádzkovateľom
              služby H4CK3D Enterprise ("Poskytovateľ") a osobou využívajúcou službu ("Používateľ").
              Používaním Služby vyjadrujete súhlas s týmito podmienkami.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">2. Popis služby</h2>
            <p>
              H4CK3D Enterprise je AI-poháňaný pracovný priestor pre vývojárov, ktorý poskytuje
              nástroje pre generovanie kódu, analýzu, a ďalšie produktívne funkcie.
              Služba je dostupná vo verziách Free, Pro a Enterprise.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">3. Predplatné a platby</h2>
            <div className="space-y-4">
              <p>
                Platené predplatné (Pro, Enterprise) sa automaticky obnovuje na konci fakturačného
                obdobia, pokiaľ ho nezrušíte.
              </p>
              <div className="border-4 border-black p-6 bg-gray-50">
                <div className="font-black uppercase text-sm mb-3">Zrušenie predplatného</div>
                <p className="text-sm">
                  Predplatné môžete kedykoľvek zrušiť cez Zákaznícky portál Stripe.
                  Po zrušení budete mať prístup k plateným funkciám do konca aktuálneho
                  fakturačného obdobia. Refundácie sa neposkytujú za čiastočne využité obdobia.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">4. Obmedzenie zodpovednosti</h2>
            <p>
              Služba je poskytovaná "taká, aká je" (as-is). Poskytovateľ nenesie zodpovednosť
              za škody spôsobené kódom vygenerovaným AI, výpadkami služby, alebo stratou dát.
              Používateľ je zodpovedný za overenie a testovanie všetkého vygenerovaného obsahu
              pred nasadením do produkcie.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">5. Prijateľné použitie</h2>
            <p className="mb-4">Používateľ sa zaväzuje nepoužívať Službu na:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-red-600 mt-2 flex-shrink-0" />
                <span>Generovanie škodlivého kódu (malware, exploity)</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-red-600 mt-2 flex-shrink-0" />
                <span>Porušovanie autorských práv alebo duševného vlastníctva</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-red-600 mt-2 flex-shrink-0" />
                <span>Nezákonné aktivity akéhokoľvek druhu</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-red-600 mt-2 flex-shrink-0" />
                <span>Preťažovanie infraštruktúry zneužívaním API limitov</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">6. Duševné vlastníctvo</h2>
            <p>
              Všetok kód a obsah vygenerovaný pomocou Služby patrí Používateľovi.
              Poskytovateľ si nečiní žiadne nároky na vygenerovaný obsah.
              Značka H4CK3D Enterprise a súvisiace vizuálne prvky sú vlastníctvom Poskytovateľa.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">7. Ukončenie</h2>
            <p>
              Poskytovateľ si vyhradzuje právo pozastaviť alebo ukončiť prístup Používateľa
              pri porušení týchto podmienok, bez predchádzajúceho upozornenia.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">8. Kontakt</h2>
            <p>
              S otázkami sa obráťte na:
            </p>
            <div className="mt-4 border-4 border-black bg-yellow-400 p-6 font-black text-lg">
              support@h4ck3d.enterprise
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
