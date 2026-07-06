/**
 * Hand-maintained facts about Renata Šiserová.
 * Everything the site says about her that does NOT come from the nightly sync lives here.
 */
export const agent = {
  name: 'Renata Šiserová',
  firstName: 'Renata',
  role: { cs: 'Realitní makléřka', en: 'Real estate agent' },
  region: { cs: 'Praha & střední Čechy', en: 'Prague & Central Bohemia' },
  motto: {
    cs: 'Budete o všem vědět, ale nemusíte se o nic starat.',
    en: 'You will know about everything — and worry about nothing.',
  },

  phone: '+420 602 601 565',
  phoneHref: 'tel:+420602601565',
  whatsapp: 'https://wa.me/420602601565',
  email: 'renata.siserova@re-max.cz',

  /** Živnostenský rejstřík / §435 obč. zák. */
  ic: '06967841',
  // TODO before launch: confirm registered address (sídlo) from rzp.gov.cz with Renata.

  office: {
    name: 'RE/MAX Anděl',
    street: 'Ostrovského 253/3',
    city: '150 00 Praha 5 – Smíchov',
    mapyCzUrl: 'https://mapy.cz/zakladni?q=Ostrovsk%C3%A9ho%20253%2F3%2C%20Praha%205',
  },

  /** remax-czech.cz identifiers — used by the sync script and source links */
  remax: {
    agentId: '8310',
    profileUrl: 'https://www.remax-czech.cz/reality/re-max-andel/renata-siserova/',
    listingsUrl: 'https://www.remax-czech.cz/reality/nemovitosti-maklere/8310/renata-siserova/',
    vcardUrl: 'https://www.remax-czech.cz/reality/vcard/8310.vcf',
  },

  /** Career: started in real estate 2018 (9th year as of 2026), 20 years in marketing before. */
  careerStartYear: 2018,
  marketingYears: 20,

  certifications: [
    {
      cs: 'RE/MAX 100% Club',
      en: 'RE/MAX 100% Club',
      note: {
        cs: 'Ocenění pro makléře s nejlepšími výsledky',
        en: 'Awarded to top-performing RE/MAX agents',
      },
    },
    {
      cs: 'Certifikovaný realitní makléř — CRM Level 2',
      en: 'Certified Real Estate Agent — CRM Level 2',
      note: {
        cs: 'Odborná certifikace RE/MAX',
        en: 'RE/MAX professional certification',
      },
    },
  ],

  social: {
    linkedin: null as string | null,
    facebook: null as string | null,
    instagram: null as string | null,
  },
} as const;

/** Years in real estate, computed against the current year at build time. */
export function yearsInRealEstate(now = new Date()): number {
  return now.getFullYear() - agent.careerStartYear + 1;
}
