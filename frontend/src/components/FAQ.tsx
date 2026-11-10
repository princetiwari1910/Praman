import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';

const FAQS = [
  {
    q: 'Does Praman file regulatory reports?',
    a: 'No. Praman drafts case summaries for a human analyst to review and approve. Regulatory filing remains entirely with your team.',
  },
  {
    q: 'Does Praman hold funds?',
    a: 'No. Praman never touches funds. It reads on-chain data and returns a risk assessment — no custody, no transactions, no access to private keys.',
  },
  {
    q: 'What blockchains does Praman support?',
    a: 'Ethereum and EVM-compatible chains (Polygon, Arbitrum, Base, BNB Chain) are live today. Bitcoin support is in private beta. Additional chains are added based on design partner feedback.',
  },
  {
    q: 'How fresh is the data?',
    a: 'On-chain transaction data refreshes continuously. Entity labels (sanctions lists, exchange tags, darknet markers) update daily from curated sources. The generated_at timestamp in the response tells you exactly when the screen ran.',
  },
  {
    q: 'Can I test before committing?',
    a: 'Yes. The live demo at /demo uses local fixture data so you can explore the full response shape and UI without any account. When you are ready to run real addresses, contact us for a design partner trial.',
  },
  {
    q: 'What is a "design partner"?',
    a: 'A design partner gets early API access, helps shape the product roadmap, and receives preferred pricing when Praman reaches general availability. In return, we ask for regular feedback sessions — typically 30 minutes every two weeks.',
  },
  {
    q: 'Is Praman legal advice?',
    a: 'No. Praman provides screening signals to support your compliance team\'s review. It is not legal advice and is not affiliated with any government body or regulator.',
  },
];

function FAQItem({ q, a }: { q: string; a: string; index?: number }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      style={{
        borderBottom: '1px solid rgba(23,20,79,0.1)',
      }}
    >
      <button
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="w-full flex justify-between items-center py-5 text-left gap-4 group"
        style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
      >
        <span
          className="text-base font-semibold"
          style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
        >
          {q}
        </span>
        <ChevronDown
          size={18}
          style={{
            color: '#5B6178',
            flexShrink: 0,
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
          }}
          aria-hidden="true"
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p
              className="pb-5 text-sm leading-relaxed"
              style={{ color: '#5B6178' }}
            >
              {a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function FAQ() {
  return (
    <section
      className="py-24"
      style={{ background: '#EDF0F7' }}
      aria-labelledby="faq-heading"
    >
      <div className="max-w-3xl mx-auto px-6">
        <div className="mb-12">
          <span className="text-sm" style={{ color: '#5B6178', fontFamily: 'DM Mono, monospace' }}>
            — questions
          </span>
          <h2
            id="faq-heading"
            className="text-4xl font-black mt-2"
            style={{ color: '#17144F', fontFamily: 'Syne Variable, Syne, sans-serif' }}
          >
            Answers to the first questions your legal team will ask.
          </h2>
        </div>

        <div>
          {FAQS.map((faq, i) => (
            <FAQItem key={i} q={faq.q} a={faq.a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
