// The sun: who's riding. From the v1 About page.
export const ABOUT_COPY = {
  beats: ["I'm a bit of a cliché, in the best way.", "I like what most people like, so I design for them easily."],
  label: "The rider",
  line: "Product designer at Appetiser Apps, Malaysia, with an architecture degree behind me. I tend to sense what people feel before they say it, and that is how I read the room, spot patterns and design for real users. Off the clock: badminton and football, Valorant, old JDMs, new gadgets, and a crème brûlée recipe I will happily share.",
  link: { text: "View résumé", href: "https://drive.google.com/file/d/1Dxcnodf57wr4Pam4C0Foj0-92Z0jPfUq/view?usp=sharing" },
};

// The slingshot out of the system, into the career galaxies (next to build)
export const EXIT_COPY = {
  beats: ["Leaving the system.", "Out there: every studio that shaped how I design."],
};

// The career galaxies, past to present. Dates as on the v1 About page.
export const CAREER_COPY = [
  { key: "sabirin", kind: "galaxy", years: "Dec 2021 – Aug 2022", field: "Architecture", org: "Sabirin Rosli Arkitek", role: "Assistant Architect",
    line: "Homes, renovations and office fit-outs, from first sketch to authority approval." },
  { key: "sno", kind: "galaxy", years: "Sep 2022 – Aug 2024", field: "Architecture", org: "SNO Architects", role: "Assistant Architect",
    line: "Housing, industrial and commercial projects for clients like Sime Darby, Maybank and Petronas." },
  { key: "switch", kind: "wormhole", field: "The switch", org: "Architecture to UX", role: ["Google UX Design Certificate", "HTML & CSS Full Course"],
    line: "Same question, new medium: how do people feel in what I design?" },
  { key: "upstack", kind: "galaxy", years: "Sep 2024 – Apr 2026", field: "Product design", org: "Upstack Studio", role: "Product Designer (UI/UX)",
    line: "Led design for Tradelink and FitCoach across B2B, B2C and SaaS." },
  { key: "appetiser", kind: "galaxy", years: "Apr 2026 – now", field: "You are here", org: "Appetiser Apps", role: "Visual Project Lead",
    line: "Visual direction across 10+ client apps at once, RETA among them." },
];

// The end of the ride: an unclaimed planet
export const CONTACT_COPY = {
  beats: ["Every planet back there was someone's idea.", "This one's still unclaimed."],
  label: "Your planet's next",
  links: [
    { text: "arieffhizer@gmail.com", href: "mailto:arieffhizer@gmail.com" },
    { text: "LinkedIn", href: "https://www.linkedin.com/in/arieff-hizer-98b412225/" },
    { text: "GitHub", href: "https://github.com/arieffhizer" },
    { text: "Résumé", href: "https://drive.google.com/file/d/1Dxcnodf57wr4Pam4C0Foj0-92Z0jPfUq/view?usp=sharing" },
  ],
};

// Project copy for the ride and the case study stubs.
// Beats: two lines each, written from the v1 case studies.
export const PROJECTS_COPY = {
  RETA: {
    slug: "reta",
    line: "A returns app for customers and drivers.",
    beats: ["Parcels leave. Most of them come back.", "RETA turns a return into a pickup at your door."],
    meta: { Role: "Visual project lead", Platform: "iOS & Android", Year: "2026" },
  },
  Viberist: {
    slug: "viberist",
    line: "A studio website with scroll-driven motion and a 3D monogram.",
    beats: ["Small studios need sites that feel big.", "I designed and built Viberist's, down to the 3D monogram."],
    meta: { Role: "Designer & front-end developer", Platform: "Web", Type: "Freelance" },
  },
  SheTrades: {
    slug: "shetrades",
    line: "A trades marketplace that gives women a safer way to book home services.",
    beats: ["Some doors are harder to open to a stranger.", "SheTrades makes trust visible before you book."],
    meta: { Role: "Product designer", Platform: "Web (desktop & mobile)", Duration: "Ongoing" },
  },
  Mori: {
    slug: "mori",
    line: "An editorial hair studio, from wordmark to live booking.",
    beats: ["A barbershop that cuts like an editorial.", "Brand, website and live booking, end to end."],
    meta: { Role: "Designer & developer", Platform: "Web", Type: "Personal project" },
  },
  FitCoach: {
    slug: "fitcoach",
    line: "Workouts, nutrition and recovery in one guided app.",
    beats: ["More data never made anyone fitter.", "FitCoach turns training, food and rest into a next step."],
    meta: { Role: "Sole UX designer", Platform: "iOS & Android", Duration: "6 weeks" },
  },
  Tradelink: {
    slug: "tradelink",
    line: "A transport management system for US and Mexico logistics teams.",
    beats: ["Dispatchers were making a new load for every stop.", "Tradelink fits the whole route into one."],
    meta: { Role: "Lead UX designer", Platform: "Web & tablet", Duration: "8 weeks" },
  },
  "Selangor FC": {
    slug: "selangorfc",
    line: "An unofficial app for the Red Giants and their fans.",
    beats: ["The Red Giants had no app.", "So I designed the one their fans were missing."],
    meta: { Role: "UI/UX designer", Platform: "Mobile app", Duration: "6 weeks" },
  },
};

// Case study sections, one screen each. On the case page the planet spins a little between sections and the sky
// swaps day (brand colour) and night (stars). Every project has a hero, four sections and an end.
// images: mockups that stand on the planet beside the copy. slot is left / right (beside it) or center (above the horizon).
// crop: [x, y, width, height] in the source image, to lift one clean screen out of a composed image.
// DRAFT copy: v1's facts in the placeholder voice (no metrics). Bodies with a "Draft:" note say which facts are
// missing and need Arieff. RETA is not in v1; its copy comes from the project itself.
export const CASE_SECTIONS = {
  // build-and-launch structure (as in v1): what it is, the site, mobile, the system, how it was built
  viberist: [
    { kind: "hero" },
    { label: "Overview", title: "Small studios need sites that feel big.", body: "Viberist builds websites for small businesses that want polish without agency complexity. Its own site had to prove it, so I designed it and built it, end to end.", points: ["Custom, not template","Clear pricing","Built for every screen","Launch handled"],
      images: [{ src: "media/viberist/duo/hero-open.jpg", alt: "Viberist's hero on iPhone Duo, open", slot: "left" }, { src: "media/viberist/duo/why-open.jpg", alt: "The why-Viberist section on iPhone Duo, open", slot: "right" }] },
    { label: "Brand", title: "A monogram, in three dimensions.", body: "A wordmark and a monogram: flat across the brand, a live 3D model on the site. It loads only where it appears, so the page stays light.",
      images: [{ src: "media/viberist/monogram-3d.png", alt: "The Viberist monogram in 3D", slot: "center" }] },
    { label: "The site", title: "One page, first impression to enquiry.", body: "Every section in the order a client decides, ending at the enquiry form.", points: ["Hero","Promises","Why us","Services","Process","FAQ","Work","Pricing","Enquiry"], numbered: true,
      images: [{ src: "media/viberist/duo/work-open.jpg", alt: "The work section on iPhone Duo, open", slot: "left" }, { src: "media/viberist/duo/pricing-open.jpg", alt: "Pricing tickets on iPhone Duo, open", slot: "right" }] },
    { label: "Mobile", title: "Designed for the phone, not squeezed onto it.", body: "Every section is laid out again for a phone. Shown here as the live site renders on the iPhone Duo, folded.",
      images: [{ src: "media/viberist/duo/hero-closed.jpg", alt: "Viberist's hero on iPhone Duo, folded", slot: "left" }, { src: "media/viberist/duo/services-closed.jpg", alt: "The services section on iPhone Duo, folded", slot: "right" }] },
    // the same hero, folded then unfolded: the mobile layout on the cover display, the desktop layout inside
    { label: "Responsive", title: "", body: "",
      images: [{ src: "media/viberist/duo/hero-closed.jpg", open: "media/viberist/duo/hero-open.jpg", alt: "Viberist's hero on iPhone Duo, unfolding from the mobile to the desktop layout", slot: "flip" }] },
    { label: "Design system", title: "Brand blue, two typefaces, one curve.", body: "Brand blue on dark navy, Onest with JetBrains Mono for the details, and one strong ease-out behind every movement.", points: ["#3F62F2","#0B1120","Onest","JetBrains Mono","Strong ease-out"],
      images: [{ src: "media/viberist/duo/process-open.jpg", alt: "The four-step process on iPhone Duo, open", slot: "left" }, { src: "media/viberist/duo/faq-open.jpg", alt: "The FAQ on iPhone Duo, open", slot: "right" }] },
    { label: "Built with", title: "Designed in Figma. Built with Claude.", body: "Faster with AI. Every decision stayed mine.", points: ["Figma","Claude","Astro","Tailwind CSS","TypeScript","Three.js"] },
    { kind: "end" },
  ],
  // a rework, not an original design: each pair sets the app as I found it (left) beside the rework (right)
  reta: [
    { kind: "hero" },
    { label: "Overview", title: "Returns, picked up at your door.", body: "RETA collects returns from people's doors and takes them back to the retailer. I didn't design the original app. I joined as visual project lead to add a second return method, RetaDirect, rework the AusPost flow, and bring the customer and driver apps to the client's liking.", points: ["Not the original design","New method: RetaDirect","AusPost reworked","Customer and driver apps"],
      images: [{ src: "media/reta/screens/after-item.jpg", alt: "The reworked customer flow: step 1, the item", slot: "left" }, { src: "media/reta/screens/after-job.jpg", alt: "The reworked driver job: a stepper in the header", slot: "right" }] },
    { label: "The problem", title: "One long form, one way back.", body: "The app I inherited asked for everything on one page, with tick boxes people skipped, and every return went through Australia Post. On the left, the app as I found it. On the right, the rework.", points: ["One long form","Tick boxes skipped","AusPost only","Wordy driver pages"],
      images: [{ src: "media/reta/screens/before-form.jpg", alt: "Before: the return request, one long form", slot: "left" }, { src: "media/reta/screens/after-item.jpg", alt: "After: step 1 of 4, with the packing choice as two clear options", slot: "right" }] },
    { label: "The user", title: "Two people at one door.", body: "Customers sending a parcel back, often with a prepaid label from the retailer, and the drivers who collect it, then either lodge it at Australia Post or take it straight to the retailer.",
      images: [{ src: "media/reta/screens/user-customer.jpg", alt: "The customer app home: start a return, and every active return with its status", slot: "left" }, { src: "media/reta/screens/user-driver.jpg", alt: "The driver app dashboard: jobs awaiting pick-up and in progress", slot: "right" }] },
    { label: "The method", title: "Start from what the client already loved.", body: "The client had approved prototypes with a step-by-step flow. I worked from them, the call recordings and the meeting notes, and rebuilt every screen with the app's own components, so it still felt like the same product.", points: ["Client calls and notes","Approved prototypes","Existing components","States and edge cases","Rounds of client feedback"], numbered: true },
    { label: "The process", title: "A second way back: RetaDirect.", body: "Customers now choose how their return travels: RetaDirect, where the driver takes it straight to the retailer, or AusPost. Beyond 50 km, RetaDirect stays on screen but disabled, so people still learn it exists.", points: ["Choose the method","RetaDirect within 50 km","AusPost label upload"],
      images: [{ src: "media/reta/screens/before-pickup.jpg", alt: "Before: tick boxes and the pickup details, AusPost only", slot: "left" }, { src: "media/reta/screens/after-method.jpg", alt: "After: AusPost or RetaDirect, chosen as cards", slot: "right" }] },
    { label: "The insights", title: "A driver should read the job, not the page.", body: "The old job page listed every field in a column. Now a stepper in the header says where the job is, and compact cards hold the item, the route with both contacts, and the fee, with the breakdown a tap away.", points: ["Stepper in the header","Route with both contacts","Fee in one line"],
      images: [{ src: "media/reta/screens/before-job.jpg", alt: "Before: the driver's job page, field by field", slot: "left" }, { src: "media/reta/screens/after-job.jpg", alt: "After: the job at a glance, its stage in the header", slot: "right" }] },
    { label: "The solution", title: "Postage, held rather than guessed.", body: "AusPost returns without a retailer label now place a temporary hold for the estimated postage. The driver claims the real amount from the receipt, and anything unused goes back automatically. With a retailer label, there is no postage at all.", points: ["Estimated postage, held","Real cost from the receipt","Unused amount released"],
      images: [{ src: "media/reta/screens/before-checkout.jpg", alt: "Before: the checkout price breakdown", slot: "left" }, { src: "media/reta/screens/after-payment.jpg", alt: "After: the payment step, with the temporary hold explained", slot: "right" }] },
    { label: "The results", title: "Signed off: “You killed it with this design.”", body: "Every round of the client's feedback became a design: a label check before booking, with examples of what an AusPost label looks like, delivery instructions for the driver, and a signature only when a parcel must be handed over in person.", points: ["Label check before booking","Delivery instructions","Signature when it matters","Both apps, both methods"],
      images: [{ src: "media/reta/screens/after-labelcheck.jpg", alt: "The label check: is this your retailer's return label?", slot: "left" }, { src: "media/reta/screens/after-pod.jpg", alt: "Proof of delivery, with the recipient's signature", slot: "right" }] },
    { label: "The learnings", title: "Improve what's loved, don't replace it.", body: "The client already loved the app and the prototypes, so the job was to extend them without breaking what worked: the same components, the same voice, clearer steps. Next: swap in a real AusPost label sample, and see how often customers choose RetaDirect." },
    { kind: "end" },
  ],
  // product-design structure; satellites, so side images come in matched pairs of phones
  shetrades: [
    { kind: "hero" },
    { label: "Overview", title: "A safer way to let someone in.", body: "SheTrades is a two-sided marketplace: women book home services with confidence, and female tradespeople find steady work. I treated trust as the core interface problem.", points: ["Search by trade","Verified profiles","Message and book safely","Every job in one place"],
      images: [{ src: "media/shetrades/screens/getstarted.jpg", alt: "Welcome: creating a SheTrades account", slot: "left" }, { src: "media/shetrades/screens/browse.jpg", alt: "Browse: jobs near Rachel, ready to quote", slot: "right" }] },
    { label: "The problem", title: "Some doors are harder to open to a stranger.", body: "Many women don't want an unfamiliar man alone in their home. And tradeswomen, with thinner referral networks, struggle to be found.", points: ["Safety concerns","Tradeswomen hard to find","No dedicated platform","Trust hard to verify online"],
      images: [{ src: "media/shetrades/screens/guidelines.jpg", alt: "Community guidelines: a safe space for women in trades", slot: "left" }, { src: "media/shetrades/screens/onb01.jpg", alt: "Welcome to SheTrades: name and date of birth", slot: "right" }] },
    { label: "The user", title: "Designing for both sides of the door.", body: "Women living alone, older women, parents at home, landlords and women's shelters on one side. On the other, tradeswomen who need to look credible fast.",
      images: [{ src: "media/shetrades/venus-3d.png", alt: "The female symbol in 3D, in SheTrades coral", slot: "center" }] },
    { label: "The method", title: "From a Lean Canvas to an interface.", body: "There was no finished brief. I worked from the founder's Lean Canvas and goals map, and turned them into design decisions.", points: ["Problem framing","Persona mapping","Trust-first planning","Engagement design","Two-sided balancing"], numbered: true,
      images: [{ src: "media/shetrades/screens/onb03.jpg", alt: "Your profile: a real photo, so others can identify you", slot: "left" }, { src: "media/shetrades/screens/completeprofile.jpg", alt: "Complete your profile: trade and bio, so clients choose with confidence", slot: "right" }] },
    { label: "The process", title: "Trust, visible before you book.", body: "Verification, reviews and job history sit in the search results, not buried in a profile. Coral, blush and near-black keep it warm and human.",
      images: [{ src: "media/shetrades/screens/jobdetails.jpg", alt: "Job details, with photos and a clear way to apply", slot: "left" }, { src: "media/shetrades/screens/workerreviews.jpg", alt: "A verified tradeswoman's profile: bio, subscription and reviews", slot: "right" }] },
    { label: "The insights", title: "Trust is decided in the list.", body: "People choose who to let in from the results, not the profile page. And tradeswomen need confidence too, not just customers.", points: ["Verification on every result","Profiles as portfolios","Reviews up front","A shareable badge","A warm visual language"],
      images: [{ src: "media/shetrades/screens/actapplied.jpg", alt: "Activity: jobs applied for", slot: "left" }, { src: "media/shetrades/screens/actposted.jpg", alt: "Activity: jobs posted", slot: "right" }] },
    { label: "The solution", title: "Trust at every step.", body: "Search by trade, verified female-only profiles, post a job and get quotes, message and book in one place, then share a badge. On desktop and mobile.",
      images: [{ src: "media/shetrades/screens/postjob.jpg", alt: "Posting a new job", slot: "left" }, { src: "media/shetrades/screens/chatclient.jpg", alt: "Chatting with a tradeswoman about a job", slot: "right" }] },
    { label: "The results", title: "Safer to book, easier to be found.", body: "Trust shows at the moment of decision. Tradeswomen get a credible way to be discovered, and a booking becomes something worth sharing. Booking a home service feels safer and more human, on both sides.", points: ["Trust at the point of decision","Tradeswomen discovered","Bookings worth sharing","Desktop and mobile"],
      images: [{ src: "media/shetrades/screens/jobposted.jpg", alt: "Your job is live", slot: "left" }, { src: "media/shetrades/screens/jobcompleted.jpg", alt: "All done: the job is completed", slot: "right" }] },
    { label: "The learnings", title: "Design from the strategy, not the brief.", body: "Turning a Lean Canvas into screens meant doing the founder-level thinking myself. Next: test how much verification people need before they trust a listing, and whether the badge brings them back.",
      images: [{ src: "media/shetrades/screens/profile.jpg", alt: "Account: profile, settings and membership", slot: "left" }, { src: "media/shetrades/screens/membership.jpg", alt: "Membership: the premium subscription", slot: "right" }] },
    { kind: "end" },
  ],
  // build-and-launch structure (as in v1): what it is, the site, mobile, the system, how it was built
  mori: [
    { kind: "hero" },
    { label: "Overview", title: "A barbershop that cuts like an editorial.", body: "Mori is a men's hair studio with an editorial, high-art take on grooming. A personal project: I designed and built it end to end, from the wordmark and hero motion to a working booking flow.", points: ["Brand story","Service menu","Gallery","Locations","Live booking"],
      images: [{ src: "media/mori/duo/hero-open.jpg", alt: "Mori's hero on iPhone Duo, open", slot: "left" }, { src: "media/mori/duo/about-open.jpg", alt: "Mori's about section on iPhone Duo, open", slot: "right" }] },
    { label: "Brand", title: "A head of hair, worn as a crown.", body: "The name comes from meori, Korean for head and for hair. A Greek profile whose hair spells the name and rises like a crown, because a man's hair is his crown.",
      images: [{ src: "media/mori/monogram-3d.png", alt: "The Mori mark: a Greek profile whose hair spells MORI", slot: "center" }] },
    { label: "The site", title: "One long page, from the hero to the chair.", body: "The story, the menu, the gallery, reviews, two branches and a live booking form, in one scroll. The hero is pinned: its card grows as you scroll.", points: ["Hero","Story and hours","Service menu","Gallery","Reviews","Locations","Live booking"], numbered: true,
      images: [{ src: "media/mori/duo/gallery-open.jpg", alt: "The gallery on iPhone Duo, open", slot: "left" }, { src: "media/mori/duo/services-open.jpg", alt: "The service menu on iPhone Duo, open", slot: "right" }] },
    { label: "Mobile", title: "The same flow, rebuilt for a phone.", body: "Not a shrunk desktop: the menu, the gallery and booking are laid out again for a thumb. Shown as the live site renders on the iPhone Duo, folded.",
      images: [{ src: "media/mori/duo/booking-closed.jpg", alt: "Booking on iPhone Duo, folded", slot: "left" }, { src: "media/mori/duo/hero-closed.jpg", bleed: true, alt: "Mori's hero on iPhone Duo, folded", slot: "right" }] },
    // the same hero, folded then unfolded: the mobile layout on the cover display, the desktop layout inside
    { label: "Responsive", title: "", body: "",
      images: [{ src: "media/mori/duo/hero-closed.jpg", bleed: true, open: "media/mori/duo/hero-open.jpg", alt: "Mori's hero on iPhone Duo, unfolding from the mobile to the desktop layout", slot: "flip" }] },
    { label: "Design system", title: "Deep rose, cream and near-black.", body: "A deep rose on cream and near-black, one friendly sans from light to extra bold, and an expressive ease-out for the intro and the reveals.", points: ["#7D2327","#F6F3EB","#1A1714","Plus Jakarta Sans","Expressive ease-out"],
      images: [{ src: "media/mori/duo/locations-open.jpg", alt: "The two branches on iPhone Duo, open", slot: "left" }, { src: "media/mori/duo/reviews-open.jpg", alt: "Reviews on iPhone Duo, open", slot: "right" }] },
    { label: "Built with", title: "Designed in Figma. Built with Claude.", body: "Faster with AI. Every decision stayed mine.", points: ["Figma","Claude","HTML & CSS","Tailwind CSS","JavaScript","GSAP"] },
    { kind: "end" },
  ],
  // product-design structure (as SheTrades), with the brand after the overview; satellites, folded Duos (a phone app)
  fitcoach: [
    { kind: "hero" },
    { label: "Overview", title: "Training, food and rest in one app.", body: "FitCoach is an all-in-one fitness app for iOS and Android. It helps people understand their progress and decide what to do next, not just log numbers. Sole UX designer, six weeks.", points: ["Structured workouts","Macro tracking","Recovery","Guidance from the data"],
      images: [{ src: "media/fitcoach/screens/dashboard.jpg", alt: "The dashboard: bodyweight this week, and today's training", slot: "left" }, { src: "media/fitcoach/screens/nutrition.jpg", alt: "Nutrition: the day's meals against its macros", slot: "right" }] },
    { label: "Brand", title: "Black and white, so the numbers lead.", body: "Training, food and rest are all read as numbers, so colour stays out of their way: no red for a missed target, no green for a good day, just progress stated plainly. High contrast reads at a glance mid‑set, and the italic FC leans forward like a sprint start.",
      images: [{ src: "media/fitcoach/fc-3d.png", alt: "The FC mark in 3D, glossy black", slot: "center" }] },
    { label: "The problem", title: "More data never made anyone fitter.", body: "Workouts in one app, food in another, recovery in a third. People had the numbers. They didn't know what to do next, and confused people stop showing up.", points: ["Switching between apps","Disconnected data","Manual comparison","Unclear next action","Lower motivation"],
      images: [{ src: "media/fitcoach/screens/onboarding.jpg", alt: "Onboarding: track every rep", slot: "left" }, { src: "media/fitcoach/screens/personalbest.jpg", alt: "An exercise, with its personal bests", slot: "right" }] },
    { label: "The user", title: "People who want to know what's next.", body: "Beginners who need direction, regular gym-goers who want better tracking, and anyone balancing training, food and rest. They don't want a record. They want to know what it means.",
      images: [{ src: "media/fitcoach/screens/bodyfat.jpg", alt: "Setting up: choosing a body fat range", slot: "left" }, { src: "media/fitcoach/screens/goals.jpg", alt: "Goal summary: a target and the calories to reach it", slot: "right" }] },
    { label: "The method", title: "Learn from the best of each.", body: "Each part of the app already had a leader. I studied them, then designed the system that joins them.", points: ["Competitor research","Feature planning","Recovery research","Design exploration","Prototyping and review"], numbered: true },
    { label: "The process", title: "A recovery score, pitched at kickoff.", body: "The brief covered workouts and nutrition. I proposed recovery, researched the metrics and built a score that turns sleep and soreness into one clear signal. With colour held back, contrast, type and clear states carry every signal.",
      images: [{ src: "media/fitcoach/screens/soreness.jpg", alt: "Recovery profile: the most sore muscle, scored 0 to 10", slot: "left" }, { src: "media/fitcoach/screens/sleep.jpg", alt: "Recovery: sleep efficiency, with a suggestion", slot: "right" }] },
    { label: "The insights", title: "Guidance, not more numbers.", body: "A workout log, a food tracker and a recovery score are worth more together than apart. Knowing when to train and when to rest turns recovery into a decision.", points: ["One connected system","Recovery at a glance","Guide, don't just record","Easy to scan","Clean and motivating"],
      images: [{ src: "media/fitcoach/screens/features.jpg", alt: "A daily workout routine, suggested for you", slot: "left" }, { src: "media/fitcoach/screens/summary.jpg", alt: "What you get: workouts, dashboard and food log, together", slot: "right" }] },
    { label: "The solution", title: "One next step, every day.", body: "Create and follow plans, track macros, check recovery and readiness, review insights and adjust. Recovery moved the app from tracking to guidance.",
      images: [{ src: "media/fitcoach/screens/createexercise.jpg", alt: "Creating a custom exercise for a plan", slot: "left" }, { src: "media/fitcoach/screens/customfood.jpg", alt: "Logging a custom food, macros included", slot: "right" }] },
    { label: "The results", title: "A clearer picture of progress.", body: "One app instead of several, a clear link between training, food and recovery, and better decisions from guided insights. People don't just track their fitness: they see how habits, recovery and performance work together.", points: ["Structured workouts","Training, food and rest linked","Fewer apps","Guided decisions","A clean identity"],
      images: [{ src: "media/fitcoach/screens/splash.jpg", alt: "FitCoach opening on its mark", slot: "left" }, { src: "media/fitcoach/screens/login.jpg", alt: "Welcome back: one sign-in for training, food and rest", slot: "right" }] },
    { label: "The learnings", title: "Turn a vague idea into a feature.", body: "Recovery started undefined and became the core of the product. Next: test the score with real fitness users, and refine it from what they actually understand." },
    { kind: "end" },
  ],
  // product-design structure (as in v1): how the problem was understood, solved, and what it did for users and the business
  tradelink: [
    { kind: "hero" },
    { label: "Overview", title: "One place for every delivery.", body: "Tradelink, now HummingbirdTMS, is a SaaS transport management system for logistics teams in the US and Mexico: loads, trucks, drivers, invoices and border crossings in one place. My focus was a workflow dispatchers could actually run, especially routes with many stops.",
      images: [{ src: "media/tradelink/screens/trucks.jpg", alt: "The fleet: trucks with their drivers and status", slot: "left" }, { src: "media/tradelink/screens/receivables.jpg", alt: "Accounts receivable: what is overdue and current, then every invoice by status", slot: "right" }] },
    { label: "The problem", title: "A new load for every stop.", body: "Logistics software rarely fails for lack of features. It fails because it is too hard to run. In systems like AlwaysTrack, one multi-stop delivery meant a separate load for every stop.", points: ["Redundant steps","Slower delivery management","Risk of data-entry errors","Cognitive load for dispatchers"] },
    { label: "The user", title: "Dispatchers think in routes, not records.", body: "Dispatchers and operations staff juggle loads, drivers, trucks, statuses and paperwork, fast and under pressure. Their real question: how do I get this from A to B, with every stop, as efficiently as possible?",
      images: [{ src: "media/tradelink/screens/currenttrip.jpg", alt: "A load's current trip, its stops traced on the map", slot: "left" }, { src: "media/tradelink/screens/dispatch.jpg", alt: "Dispatch addresses: every pick-up and drop-off point, ready to reuse", slot: "right" }] },
    { label: "The method", title: "Designed around the work, not the system.", body: "Every step started from how dispatchers already plan deliveries.", points: ["Competitor analysis","Workflow mapping","Information architecture","Prototyping","Stakeholder walkthroughs"], numbered: true },
    { label: "The process", title: "The problem was the structure, not the screen.", body: "Mapping how dispatchers create a load, assign a driver and truck, manage stops and track progress showed the real issue was the workflow. So a load became a container for trips: each planned with its stops, drivers and trailer, each with its own status, down to the border crossing.",
      images: [{ src: "media/tradelink/screens/createload.jpg", alt: "Create load: planning a trip, its drivers and a company trailer", slot: "left" }, { src: "media/tradelink/screens/loadedit.jpg", alt: "Load #583: four trips in one load, the current one at the border", slot: "right" }] },
    { label: "The insights", title: "One route should feel like one delivery.", body: "Dispatchers want to manage deliveries, not the system. They need to see at a glance what is happening, what needs attention and what to do next: every trip's status in one list, and every stop of a load on one page.", points: ["One load, many stops","Statuses that scan","Dashboards by priority","Tables built for decisions","No clutter"],
      images: [{ src: "media/tradelink/screens/openloads.jpg", alt: "Open loads: every current trip across loads, each with its status", slot: "left" }, { src: "media/tradelink/screens/loadedit.jpg", alt: "Load #583: four trips in one load, the current one at the border", slot: "right" }] },
    { label: "The solution", title: "The whole route in one load.", body: "One platform to create and manage loads, assign drivers and trucks, run multi-stop deliveries, track them live and keep the paperwork. At its heart: every stop inside a single load.",
      images: [{ src: "media/tradelink/screens/addtrip.jpg", alt: "Load #583: its trips in one place, and a new trip being added", slot: "left" }, { src: "media/tradelink/screens/currenttrip.jpg", alt: "Tracking the load live: its current trip traced on the map", slot: "right" }] },
    { label: "The results", title: "Fewer steps, clearer operations.", body: "For dispatchers: fewer steps and faster decisions, with a clear view of every delivery. For the business: the same load carries through to its invoice and the driver's pay, so nothing is typed twice, and a structure that scales.", points: ["Fewer steps per delivery","Clearer visibility","Faster decisions","Less re-entry, fewer errors","A structure that scales"],
      images: [{ src: "media/tradelink/screens/invoice.jpg", alt: "Invoice #583, built from the load it bills", slot: "left" }, { src: "media/tradelink/screens/driverpay.jpg", alt: "Load #345: the driver's trip-mile pay, extra payments and reimbursements", slot: "right" }] },
    { label: "The learnings", title: "Design for the mental model.", body: "Fixing the workflow did more than polishing the screens ever could. Next time: test with more dispatchers, and measure task time between the old flow and the new one." },
    { kind: "end" },
  ],
  // product-design structure (as in v1); an unofficial concept
  selangorfc: [
    { kind: "hero" },
    { label: "Overview", title: "The app the Red Giants never had.", body: "Selangor FC, one of Malaysia's most successful clubs, runs news, tickets and its shop through a website. This is an unofficial concept for the app its fans were missing. UI/UX designer, six weeks.",
      images: [{ src: "media/selangorfc/screens/welcome.jpg", alt: "Good morning, Arieff: the app opening in club red", slot: "left" }, { src: "media/selangorfc/screens/home.jpg", alt: "Home: the hero slider, the next fixtures and the shop", slot: "right" }] },
    { label: "The problem", title: "A website, on a phone.", body: "Without an app, fans do everything in a mobile browser that was never built for it.", points: ["Awkward on mobile","Buying feels unsafe","No fixtures or standings","No digital team card"] },
    { label: "The user", title: "Fans who follow every match.", body: "Supporters who check fixtures, buy jerseys and tickets, and carry a Red Giants Team Card. On matchday they want the next fixture and a ticket in a few taps. Between matches, they need a reason to open the app at all.",
      images: [{ src: "media/selangorfc/screens/squad.jpg", alt: "The squad: players by position", slot: "left" }, { src: "media/selangorfc/screens/mlbb.jpg", alt: "The MLBB esports squad", slot: "right" }] },
    { label: "The method", title: "Start with the fans.", body: "I ran usability tests with a group of Selangor FC fans to find problems, spot opportunities and learn how they behave.", points: ["Usability testing","Redefine","Reimagine","Redesign","Flows and design system"], numbered: true,
      images: [{ src: "media/selangorfc/ultrasel-3d.png", alt: "The badge of ultraSel, Selangor FC's supporters, in 3D", slot: "center" }] },
    { label: "The process", title: "Redefine, reimagine, redesign.", body: "Redefine: a digital team card at the heart of the app. Reimagine: a hero slider, fixtures, a calendar and an account worth opening. Redesign: a store inside the app, live order tracking and clear categories.",
      images: [{ src: "media/selangorfc/screens/card.jpg", alt: "The RGTC digital team card, with its QR code and Refer a Friend", slot: "left" }, { src: "media/selangorfc/screens/store.jpg", alt: "The store inside the app: categories and jerseys", slot: "right" }] },
    { label: "The insights", title: "Fans came for fixtures.", body: "The homepage had no fixtures or standings, buying felt unsafe, and nothing was built for a phone. The flow stays close to the website's, so fans still feel at home.", points: ["Team card in the nav bar","Fixtures and a calendar","A store inside the app","Live order tracking","A familiar flow"] },
    { label: "The solution", title: "Matchday in one place.", body: "A team card anchored in the navigation bar, Refer a Friend, fixtures and a calendar, a customisable account, and a safer shop with live tracking. Poppins, club red and gold.",
      images: [{ src: "media/selangorfc/screens/home.jpg", alt: "Home: the hero slider, the next fixtures and the shop", slot: "left" }, { src: "media/selangorfc/screens/account.jpg", alt: "The account: the fan's own shirt, favourite player and team card", slot: "right" }] },
    { label: "The results", title: "A channel the club owns.", body: "News, tickets, the shop and the team card in one place, and room for the club's own voice when it matters. It's a concept, so the measure is what it's built for: fans closer to the club, a stronger community and a bigger digital presence.", points: ["Closer fan engagement","A stronger community","A bigger digital presence"],
      images: [{ src: "media/selangorfc/screens/campaign.jpg", alt: "The club speaking to its fans directly, as they open the app", slot: "left" }, { src: "media/selangorfc/screens/card.jpg", alt: "The RGTC digital team card, with its QR code and Refer a Friend", slot: "right" }] },
    { label: "The learnings", title: "Familiar first, new second.", body: "Keeping the website's flow made the app easy to adopt. The new ideas, the team card, fixtures and the store, sit on top of it rather than replacing it. Next: test whether the card brings fans back between matches, and compare checkout completion with the website." },
    { kind: "end" },
  ],
};

// Addresses. On the live site a case study is /<slug> (GitHub Pages serves it from <slug>.html) and home is /; the
// local preview server cannot serve those, so there they stay case.html?p=<slug> and index.html
const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
export const caseHref = (slug) => (LOCAL ? `case.html?p=${slug}` : `/${slug}`);
export const homeHref = (slug) => (LOCAL ? "index.html" : "/") + (slug ? `#${slug}` : "");
