import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-white py-20 px-4 font-sans selection:bg-black selection:text-white">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/"
          className="inline-flex items-center gap-2 font-black uppercase text-sm hover:text-red-600 transition-colors mb-12 min-h-[44px]"
        >
          <ArrowLeft size={16} /> Späť na úvod
        </Link>

        <h1 className="text-4xl md:text-6xl font-black uppercase mb-8 leading-none">Zásady ochrany osobných údajov</h1>

        <div className="border-l-4 border-black pl-4 mb-8 font-bold text-sm text-gray-500 uppercase">
          Posledná aktualizácia: 9. apríl 2026
        </div>

        <div className="space-y-8 font-bold text-gray-800 leading-relaxed">
          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">1. Úvod</h2>
            <p>
              Papi Hair Design ("my", "nás", "naše") prevádzkuje webovú aplikáciu Papi Hair Design
              ("Služba"). Táto stránka vás informuje o našich zásadách týkajúcich sa zhromažďovania,
              používania a zverejňovania osobných údajov pri používaní našej Služby.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">2. Zhromažďované údaje</h2>
            <p className="mb-4">Pri používaní Služby môžeme zhromažďovať nasledujúce údaje:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-red-600 mt-2 flex-shrink-0" />
                <span><strong>E-mailová adresa</strong> — pre účely autentifikácie a komunikácie.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-red-600 mt-2 flex-shrink-0" />
                <span><strong>Platobné údaje</strong> — spracovávané cez Stripe. Neuchovávame čísla kariet.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-red-600 mt-2 flex-shrink-0" />
                <span><strong>Údaje o používaní</strong> — konverzácie s AI, nahrané súbory, logy relácií.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-red-600 mt-2 flex-shrink-0" />
                <span><strong>Technické údaje</strong> — IP adresa, typ prehliadača, zariadenie.</span>
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">3. Tretie strany</h2>
            <p className="mb-4">Na zabezpečenie našej Služby používame nasledujúcich poskytovateľov:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="border-4 border-black p-4">
                <div className="font-black uppercase text-sm mb-1">Firebase</div>
                <div className="text-xs text-gray-500">Autentifikácia, databáza a cloud funkcie</div>
              </div>
              <div className="border-4 border-black p-4">
                <div className="font-black uppercase text-sm mb-1">Stripe</div>
                <div className="text-xs text-gray-500">Spracovanie platieb</div>
              </div>
              <div className="border-4 border-black p-4">
                <div className="font-black uppercase text-sm mb-1">OpenAI</div>
                <div className="text-xs text-gray-500">AI spracovanie</div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">4. Cookies</h2>
            <p>
              Používame nevyhnutné cookies na udržanie vašej prihlásenia relácie. Nepoužívame
              reklamné ani sledovacie cookies tretích strán.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">5. Vaše práva (GDPR)</h2>
            <p className="mb-4">Ako užívateľ máte právo na:</p>
            <ul className="space-y-2 ml-4">
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-yellow-400 mt-2 flex-shrink-0" />
                <span>Prístup k vašim osobným údajom</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-yellow-400 mt-2 flex-shrink-0" />
                <span>Opravu nepresných údajov</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-yellow-400 mt-2 flex-shrink-0" />
                <span>Vymazanie vašich údajov ("právo byť zabudnutý")</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="w-2 h-2 bg-yellow-400 mt-2 flex-shrink-0" />
                <span>Export údajov v strojovo čitateľnom formáte</span>
              </li>
            </ul>
            <div className="mt-4 rounded-xl border-2 border-black bg-gray-50 p-4 text-xs font-mono text-gray-700">
              <div>GDPR export endpoint: /gdpr/export</div>
              <div>GDPR delete endpoint: /gdpr/delete</div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase mb-4 border-b-4 border-black pb-2">6. Kontakt</h2>
            <p>
              Pre akékoľvek otázky ohľadom ochrany súkromia nás kontaktujte na:
            </p>
            <div className="mt-4 border-4 border-black bg-yellow-400 p-6 font-black text-lg">
              booking@papihairdesign.sk
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
