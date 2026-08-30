/**
 * Fills missing French and Arabic on public-site content.
 *
 * The showcase content was seeded in English before the public site went
 * French/Arabic-only. prisma/seed.ts now carries fr + ar for all of it, but it
 * only writes rows that do not already exist — so an installation seeded
 * earlier keeps the English values. This script closes that gap in place.
 *
 * It runs on every deploy (see the `build` script), right after the seed: that
 * is the only way the translations reach an environment whose database was
 * populated by an older seed. Because it only ever fills an empty field, a
 * deploy that has nothing to do is a no-op that reports "filled: 0".
 *
 * Safe to re-run:
 *   - It only ever fills a field that is currently empty. An existing
 *     translation is never overwritten, so hand edits made in Super Admin
 *     survive.
 *   - Values are keyed by the English source string and copied verbatim from
 *     prisma/seed.ts, so a fresh install and a backfilled one end up identical.
 *   - Anything it cannot find a translation for is reported, not guessed.
 *
 *   npx tsx scripts/backfill-translations.ts --dry-run
 *   npx tsx scripts/backfill-translations.ts
 */
import dotenv from "dotenv";
dotenv.config();

const DRY = process.argv.includes("--dry-run");

type Pair = { fr: string; ar: string };

/**
 * English source → French / Arabic.
 *
 * Keyed on the source string rather than on row ids so the same phrase
 * ("View Programmes" appears in three CTA banners) is translated once and
 * stays consistent everywhere it is used.
 */
const T: Record<string, Pair> = {
  // ---------------- FAQs ----------------
  "How quickly will I get a reply?": {
    fr: "Sous quel délai vais-je recevoir une réponse ?",
    ar: "في غضون كم من الوقت أتلقّى رداً؟",
  },
  "<p>We aim to respond to all enquiries within 1-2 working days.</p>": {
    fr: "<p>Nous nous efforçons de répondre à toutes les demandes sous 1 à 2 jours ouvrés.</p>",
    ar: "<p>نحرص على الرد على جميع الاستفسارات في غضون يوم إلى يومَي عمل.</p>",
  },
  "I have a safeguarding concern — who do I contact?": {
    fr: "J'ai une préoccupation concernant la protection d'un enfant — qui dois-je contacter ?",
    ar: "لديّ مخاوف تتعلق بحماية طفل — بمن أتصل؟",
  },
  '<p>Please use the contact form or call us directly and mark your message as "Safeguarding" so it is treated as a priority.</p>': {
    fr: "<p>Merci d'utiliser le formulaire de contact ou de nous appeler directement, en indiquant « Protection de l'enfance » dans votre message pour qu'il soit traité en priorité.</p>",
    ar: "<p>يُرجى استخدام نموذج الاتصال أو الاتصال بنا مباشرة، مع كتابة «حماية الأطفال» في رسالتك لتُعالَج على سبيل الأولوية.</p>",
  },
  "Who are the courses aimed at?": {
    fr: "À qui s'adressent les séances ?",
    ar: "لمن تُوجَّه هذه الحصص؟",
  },
  "<p>Football School is open to all boys and girls aged 6-16, of all abilities.</p>": {
    fr: "<p>L'École de Football est ouverte à tous les garçons et filles de 6 à 16 ans, quel que soit leur niveau.</p>",
    ar: "<p>مدرسة كرة القدم مفتوحة لجميع الفتيان والفتيات من 6 إلى 16 سنة، أياً كان مستواهم.</p>",
  },
  "How much is the course?": {
    fr: "Quel est le tarif ?",
    ar: "ما هو السعر؟",
  },
  "<p>Pricing starts from 4,000 DA per month depending on age group — see the schedule above for full pricing.</p>": {
    fr: "<p>Les tarifs débutent à 4 000 DA par mois selon la catégorie d'âge — voir le planning ci-dessus pour le détail.</p>",
    ar: "<p>تبدأ الأسعار من 4 000 دج شهرياً حسب الفئة العمرية — انظر الجدول أعلاه للتفاصيل.</p>",
  },
  "What should my child bring?": {
    fr: "Que doit apporter mon enfant ?",
    ar: "ماذا يجب أن يُحضر طفلي؟",
  },
  "<p>Please bring boots, shin pads, a water bottle and both light and dark training tops.</p>": {
    fr: "<p>Merci de prévoir des crampons, des protège-tibias, une bouteille d'eau et deux maillots d'entraînement, un clair et un foncé.</p>",
    ar: "<p>يُرجى إحضار حذاء كرة قدم وواقيات للساقين وقارورة ماء وقميصَي تدريب، أحدهما فاتح والآخر داكن.</p>",
  },
  "What age groups do you coach?": {
    fr: "Quelles catégories d'âge encadrez-vous ?",
    ar: "ما الفئات العمرية التي تؤطّرونها؟",
  },
  "<p>We coach players from age 6 through 16 across our Football School, Holiday Camps and Development Squads.</p>": {
    fr: "<p>Nous encadrons les joueurs de 6 à 16 ans, à travers l'École de Football, les stages de vacances et les équipes de développement.</p>",
    ar: "<p>نؤطّر اللاعبين من 6 إلى 16 سنة، عبر مدرسة كرة القدم وتربّصات العطل وفرق التطوير.</p>",
  },
  "Do you offer trial sessions?": {
    fr: "Proposez-vous des séances d'essai ?",
    ar: "هل توفّرون حصصاً تجريبية؟",
  },
  "<p>Yes — contact us or use the Book Now button on any programme page to arrange a trial session.</p>": {
    fr: "<p>Oui — contactez-nous ou utilisez le bouton « Réserver » sur n'importe quelle page de programme pour organiser une séance d'essai.</p>",
    ar: "<p>نعم — تواصل معنا أو استخدم زر «احجز الآن» في أي صفحة برنامج لترتيب حصة تجريبية.</p>",
  },
  "What is your safeguarding policy?": {
    fr: "Quelle est votre politique de protection de l'enfance ?",
    ar: "ما هي سياستكم في حماية الأطفال؟",
  },
  "<p>All coaches are vetted and DBS-checked, and every session follows our full safeguarding policy. Contact us for a copy.</p>": {
    fr: "<p>Tous nos entraîneurs font l'objet de vérifications, et chaque séance suit notre politique complète de protection de l'enfance. Contactez-nous pour en recevoir une copie.</p>",
    ar: "<p>يخضع جميع مدربينا للتدقيق، وتلتزم كل حصة بسياستنا الشاملة لحماية الأطفال. تواصل معنا للحصول على نسخة منها.</p>",
  },
  "How does my child move to the next stage?": {
    fr: "Comment mon enfant passe-t-il à l'étape suivante ?",
    ar: "كيف ينتقل طفلي إلى المرحلة التالية؟",
  },
  "<p>Our coaches continuously assess players during regular sessions and will discuss progression opportunities directly with parents.</p>": {
    fr: "<p>Nos entraîneurs évaluent les joueurs en continu pendant les séances et discutent directement des possibilités de progression avec les parents.</p>",
    ar: "<p>يقيّم مدربونا اللاعبين باستمرار خلال الحصص، ويناقشون فرص التدرّج مباشرة مع الأولياء.</p>",
  },
  "Can a player skip a stage?": {
    fr: "Un joueur peut-il sauter une étape ?",
    ar: "هل يمكن للاعب أن يتخطّى مرحلة؟",
  },
  "<p>Progression is based on ability and readiness rather than age alone, so this is possible in some cases following assessment.</p>": {
    fr: "<p>La progression repose sur le niveau et la maturité plutôt que sur l'âge seul : c'est donc possible dans certains cas, après évaluation.</p>",
    ar: "<p>يقوم التدرّج على المستوى والجاهزية لا على السن وحده، لذا فهذا ممكن في بعض الحالات بعد التقييم.</p>",
  },
  "How are players selected for Development Squads?": {
    fr: "Comment les joueurs sont-ils sélectionnés pour les équipes de développement ?",
    ar: "كيف يُختار اللاعبون لفرق التطوير؟",
  },
  "<p>Players are assessed during their regular weekly sessions. Our coaching team identifies players ready for the next level and invites them to register.</p>": {
    fr: "<p>Les joueurs sont évalués pendant leurs séances hebdomadaires habituelles. Notre équipe d'encadrement identifie ceux qui sont prêts pour le niveau supérieur et les invite à s'inscrire.</p>",
    ar: "<p>يُقيَّم اللاعبون خلال حصصهم الأسبوعية المعتادة. ويحدّد طاقمنا التدريبي من هم جاهزون للمستوى الأعلى ويدعوهم إلى التسجيل.</p>",
  },
  "Is there an additional cost for Development Squads?": {
    fr: "Les équipes de développement ont-elles un coût supplémentaire ?",
    ar: "هل هناك تكلفة إضافية لفرق التطوير؟",
  },
  "<p>Yes — Development Squads have their own pricing, which will be confirmed once your registration is reviewed.</p>": {
    fr: "<p>Oui — les équipes de développement ont leur propre tarification, qui vous sera confirmée après examen de votre inscription.</p>",
    ar: "<p>نعم — لفرق التطوير تسعيرة خاصة بها، تُؤكَّد لك بعد دراسة طلب تسجيلك.</p>",
  },

  // ---------------- Pathway levels ----------------
  Foundation: { fr: "Initiation", ar: "التأسيس" },
  Development: { fr: "Développement", ar: "التطوير" },
  Advanced: { fr: "Perfectionnement", ar: "التطوير المتقدّم" },
  "Development Squads": { fr: "Équipes de développement", ar: "فرق التطوير" },
  "Ages 6-8": { fr: "6 à 8 ans", ar: "من 6 إلى 8 سنوات" },
  "Ages 9-12": { fr: "9 à 12 ans", ar: "من 9 إلى 12 سنة" },
  "Ages 13-16": { fr: "13 à 16 ans", ar: "من 13 إلى 16 سنة" },
  "By assessment": { fr: "Sur évaluation", ar: "بعد التقييم" },
  "Introducing the fundamentals of the game in a fun, safe environment.": {
    fr: "Découvrir les fondamentaux du jeu dans un cadre ludique et sécurisé.",
    ar: "اكتشاف أساسيات اللعبة في أجواء ممتعة وآمنة.",
  },
  "Building technical ability, decision-making and game understanding.": {
    fr: "Construire la technique, la prise de décision et la lecture du jeu.",
    ar: "بناء المهارة التقنية واتخاذ القرار وفهم اللعب.",
  },
  "Preparing players for competitive football and representative squads.": {
    fr: "Préparer les joueurs au football de compétition et aux sélections.",
    ar: "إعداد اللاعبين لكرة القدم التنافسية والفرق التمثيلية.",
  },
  "Our highest level of coaching for players identified through assessment.": {
    fr: "Notre plus haut niveau d'encadrement, pour les joueurs retenus après évaluation.",
    ar: "أعلى مستويات التأطير لدينا، للاعبين المختارين بعد التقييم.",
  },

  // ---------------- Navigation / footer ----------------
  Programmes: { fr: "Programmes", ar: "البرامج" },
  Venues: { fr: "Sites", ar: "المواقع" },
  News: { fr: "Actualités", ar: "الأخبار" },
  "Who We Are": { fr: "Qui sommes-nous", ar: "من نحن" },
  Methodology: { fr: "Méthodologie", ar: "المنهجية" },
  Pathway: { fr: "Parcours", ar: "المسار" },
  "Contact Us": { fr: "Nous contacter", ar: "اتصل بنا" },
  Squads: { fr: "Équipes", ar: "الفرق" },
  Explore: { fr: "Explorer", ar: "استكشف" },
  About: { fr: "À propos", ar: "عن الأكاديمية" },
  Safeguarding: { fr: "Protection de l'enfance", ar: "حماية الأطفال" },
  "Train, compete and grow with Football Skills Academy.": {
    fr: "Entraînez-vous, progressez et grandissez avec Football Skills Academy.",
    ar: "تدرّب وتنافس وطوّر مهاراتك مع أكاديمية Football Skills Academy.",
  },

  // ---------------- News ----------------
  "Welcome to Football Skills Academy": {
    fr: "Bienvenue à Football Skills Academy",
    ar: "مرحباً بكم في أكاديمية Football Skills Academy",
  },
  "We're excited to launch our new Showcase Website, with programmes, venues and Development Squads all in one place.": {
    fr: "Nous sommes heureux de lancer notre nouveau site : programmes, sites d'entraînement et équipes de développement réunis au même endroit.",
    ar: "يسعدنا إطلاق موقعنا الجديد، حيث تجتمع البرامج ومواقع التدريب وفرق التطوير في مكان واحد.",
  },
  "Holiday Football Camp Dates Announced": {
    fr: "Les dates du stage de football sont annoncées",
    ar: "الإعلان عن مواعيد تربّص كرة القدم",
  },
  "Our next Holiday Football Camp is open for registration — a full week of training and match play.": {
    fr: "Les inscriptions à notre prochain stage de football sont ouvertes : une semaine complète d'entraînement et de matchs.",
    ar: "فُتح التسجيل في تربّصنا المقبل لكرة القدم — أسبوع كامل من التدريب والمباريات.",
  },
  "Academy News": { fr: "Actualités de l'académie", ar: "أخبار الأكاديمية" },

  // ---------------- Programmes ----------------
  "Football School": { fr: "École de Football", ar: "مدرسة كرة القدم" },
  "Holiday Football Camp": { fr: "Stage de Football", ar: "تربّص كرة القدم" },
  "Weekly Programmes": { fr: "Programmes hebdomadaires", ar: "البرامج الأسبوعية" },
  "Holiday Camps": { fr: "Stages de vacances", ar: "تربّصات العطل" },
  "Ages 6-16": { fr: "6 à 16 ans", ar: "من 6 إلى 16 سنة" },
  "From 4,000 DA / month": { fr: "À partir de 4 000 DA / mois", ar: "ابتداءً من 4 000 دج / شهرياً" },
  "From 12,000 DA / week": { fr: "À partir de 12 000 DA / semaine", ar: "ابتداءً من 12 000 دج / أسبوعياً" },
  "All abilities welcome. Weekly technical training for players aged 6-16.": {
    fr: "Tous niveaux bienvenus. Entraînement technique hebdomadaire pour les 6-16 ans.",
    ar: "جميع المستويات مرحَّب بها. تدريب تقني أسبوعي للفئة 6–16 سنة.",
  },
  "A week of intensive training and match play during the school holidays.": {
    fr: "Une semaine d'entraînement intensif et de matchs pendant les vacances scolaires.",
    ar: "أسبوع من التدريب المكثّف والمباريات خلال العطلة المدرسية.",
  },

  // ---------------- Coaches ----------------
  "Head of Coaching": { fr: "Responsable de l'encadrement", ar: "مسؤول التأطير" },
  "Foundation Phase Lead": { fr: "Responsable de la phase d'initiation", ar: "مسؤول مرحلة التأسيس" },
  "Development Squad Coach": { fr: "Entraîneur des équipes de développement", ar: "مدرّب فرق التطوير" },
  "UEFA A-licensed coach with over a decade of youth development experience.": {
    fr: "Entraîneur titulaire de la licence UEFA A, avec plus de dix ans d'expérience dans la formation des jeunes.",
    ar: "مدرّب حاصل على رخصة UEFA A، بخبرة تتجاوز عشر سنوات في تكوين الفئات الشابة.",
  },
  "Specialist in technical development for players aged 6-10.": {
    fr: "Spécialiste du développement technique des joueurs de 6 à 10 ans.",
    ar: "مختص في التطوير التقني للاعبين من 6 إلى 10 سنوات.",
  },
  "Former semi-professional player focused on the transition to competitive football.": {
    fr: "Ancien joueur semi-professionnel, spécialisé dans la transition vers le football de compétition.",
    ar: "لاعب سابق شبه محترف، متخصص في مرحلة الانتقال إلى كرة القدم التنافسية.",
  },

  // ---------------- Venues ----------------
  "Our flagship venue with 3 full-size pitches and a dedicated indoor training hall.": {
    fr: "Notre site principal, avec 3 terrains grande taille et une salle d'entraînement couverte.",
    ar: "موقعنا الرئيسي، ويضم 3 ملاعب بالحجم الكامل وقاعة تدريب مغطاة.",
  },
  "A modern riverside venue used for our weekly programmes and game festivals.": {
    fr: "Un site moderne en bord de rivière, utilisé pour nos programmes hebdomadaires et nos festivals de jeu.",
    ar: "موقع حديث على ضفة النهر، يُستخدم لبرامجنا الأسبوعية ومهرجاناتنا الكروية.",
  },
  "Home to our Development Squads and holiday camp programmes.": {
    fr: "Le site de nos équipes de développement et de nos stages de vacances.",
    ar: "مقر فرق التطوير وبرامج تربّصات العطل لدينا.",
  },

  // ---------------- Landing sections: shared CTAs ----------------
  "View Programmes": { fr: "Voir les programmes", ar: "عرض البرامج" },
  "View Pathway": { fr: "Voir le parcours", ar: "عرض المسار" },
  "Book a Trial": { fr: "Réserver un essai", ar: "احجز حصة تجريبية" },
  "Book Now": { fr: "Réserver", ar: "احجز الآن" },
  "Our Methodology": { fr: "Notre méthodologie", ar: "منهجيتنا" },
  "Learn about our methodology": { fr: "Découvrir notre méthodologie", ar: "اكتشف منهجيتنا" },
  "Frequently Asked Questions": { fr: "Questions fréquentes", ar: "الأسئلة الشائعة" },
  "Football Skills Academy": { fr: "Football Skills Academy", ar: "Football Skills Academy" },

  // ---------------- Landing sections: home ----------------
  "Every Player.\nOne Clear Pathway.": {
    fr: "Chaque joueur.\nUn seul chemin clair.",
    ar: "كل لاعب.\nمسار واحد واضح.",
  },
  "Year-round football programmes for players aged 6-16, built around technical development, teamwork and a genuine love of the game.": {
    fr: "Des programmes de football toute l'année pour les joueurs de 6 à 16 ans, centrés sur le développement technique, l'esprit d'équipe et le plaisir de jouer.",
    ar: "برامج كروية على مدار السنة للاعبين من 6 إلى 16 سنة، تركّز على التطوير التقني وروح الفريق ومتعة اللعب.",
  },
  "Players trained": { fr: "Joueurs formés", ar: "لاعبون تدرّبوا لدينا" },
  "Years of coaching": { fr: "Années d'encadrement", ar: "سنوات من التأطير" },
  "Qualified coaches": { fr: "Entraîneurs qualifiés", ar: "مدربون مؤهَّلون" },
  "Who we are": { fr: "Qui sommes-nous", ar: "من نحن" },
  "Built around long-term player development": {
    fr: "Pensé pour le développement du joueur sur la durée",
    ar: "مصمَّم لتطوير اللاعب على المدى الطويل",
  },
  "Football Skills Academy was founded to give young players a structured, age-appropriate pathway — from their first touch of the ball through to representative squad football. Every session is planned around what a player needs at that stage, not a one-size-fits-all drill sheet.": {
    fr: "Football Skills Academy a été fondée pour offrir aux jeunes joueurs un parcours structuré et adapté à leur âge, des premiers pas avec le ballon jusqu'au football en équipe représentative. Chaque séance est construite autour de ce dont le joueur a besoin à ce stade, et non selon une fiche d'exercices unique pour tous.",
    ar: "تأسست أكاديمية Football Skills Academy لتوفّر للاعبين الشباب مساراً منظّماً يناسب أعمارهم، من الخطوات الأولى مع الكرة إلى اللعب ضمن الفرق التمثيلية. وتُبنى كل حصة حول ما يحتاجه اللاعب في تلك المرحلة، لا وفق برنامج تمارين موحَّد للجميع.",
  },

  // ---------------- Programme long descriptions ----------------
  "Football School is our year-round weekly programme for boys and girls aged 6-16. Players train and develop at a world-class facility, focusing on technical development, decision-making, confidence and creativity — delivered by our qualified coaches following a single academy-wide methodology. Fun, skills and a long-term love of the game start here.": {
    fr: "L'École de Football est notre programme hebdomadaire à l'année pour les garçons et filles de 6 à 16 ans. Les joueurs s'entraînent dans des installations de qualité, avec un travail centré sur la technique, la prise de décision, la confiance et la créativité — encadré par nos entraîneurs qualifiés selon une méthodologie unique à l'académie. Le plaisir, les compétences et l'amour durable du jeu commencent ici.",
    ar: "مدرسة كرة القدم هي برنامجنا الأسبوعي على مدار السنة للفتيان والفتيات من 6 إلى 16 سنة. يتدرّب اللاعبون في مرافق عالية الجودة، مع التركيز على التطوير التقني واتخاذ القرار والثقة بالنفس والإبداع — بإشراف مدربينا المؤهَّلين ووفق منهجية واحدة على مستوى الأكاديمية. هنا تبدأ المتعة والمهارة وحب اللعبة الذي يدوم.",
  },
  "Football School Summer": {
    fr: "École de Football — Été",
    ar: "مدرسة كرة القدم — صيف",
  },
  "Our Holiday Football Camp gives players a full week of training, small-sided games and tournaments during school holidays, led by our coaching team. A great way to keep progressing — or to try the academy for the first time.": {
    fr: "Notre stage de football offre aux joueurs une semaine complète d'entraînement, de jeux réduits et de tournois pendant les vacances scolaires, encadrée par notre équipe technique. Une excellente façon de continuer à progresser — ou de découvrir l'académie pour la première fois.",
    ar: "يمنح تربّص كرة القدم اللاعبين أسبوعاً كاملاً من التدريب والمباريات المصغّرة والدورات خلال العطلة المدرسية، بإشراف طاقمنا التدريبي. طريقة ممتازة لمواصلة التقدّم — أو لاكتشاف الأكاديمية لأول مرة.",
  },
  "Why families choose us": { fr: "Pourquoi les familles nous choisissent", ar: "لماذا تختارنا العائلات" },
  "Expert coaching": { fr: "Coaching expert", ar: "تأطير متخصّص" },
  "Structured sessions delivered by qualified coaches with a consistent academy-wide philosophy.": {
    fr: "Des séances structurées animées par des entraîneurs qualifiés.",
    ar: "حصص منظّمة يشرف عليها مدربون مؤهَّلون.",
  },
  "Team spirit": { fr: "Esprit d'équipe", ar: "روح الفريق" },
  "Players build lasting friendships and learn what it means to compete as a team.": {
    fr: "Les joueurs tissent des liens durables et apprennent l'esprit d'équipe.",
    ar: "ينسج اللاعبون صداقات دائمة ويتعلّمون روح الفريق.",
  },
  "Safe environment": { fr: "Environnement sûr", ar: "بيئة آمنة" },
  "Full safeguarding standards and medical support at every venue and session.": {
    fr: "Des normes de protection complètes à chaque séance.",
    ar: "معايير حماية شاملة في كل حصة.",
  },
  "Modern methodology": { fr: "Méthodologie moderne", ar: "منهجية حديثة" },
  "Constraints-based coaching that builds decision-making, not just technique.": {
    fr: "Un coaching basé sur la prise de décision, pas seulement la technique.",
    ar: "تدريب يقوم على اتخاذ القرار، لا على التقنية وحدها.",
  },
  "Competitive pathway": { fr: "Parcours compétitif", ar: "مسار تنافسي" },
  "Game festivals, fixtures and a route into our Development Squads.": {
    fr: "Des matchs, festivals et un accès à nos équipes de développement.",
    ar: "مباريات ومهرجانات كروية وفرصة الانضمام إلى فرق التطوير لدينا.",
  },
  "Real progression": { fr: "Vraie progression", ar: "تقدّم حقيقي" },
  "Every player's development is tracked against clear, age-based milestones.": {
    fr: "Le développement de chaque joueur est suivi selon des étapes claires.",
    ar: "يُتابَع تطوّر كل لاعب وفق مراحل واضحة.",
  },
  "Plans & Pricing": { fr: "Formules et tarifs", ar: "الصيغ والأسعار" },
  "Flexible plans to fit your schedule.": {
    fr: "Des formules flexibles adaptées à votre emploi du temps.",
    ar: "صيغ مرنة تناسب برنامجك.",
  },
  "Sponsors & Partners": { fr: "Sponsors & Partenaires", ar: "الرعاة والشركاء" },
  "Ready to join?": { fr: "Prêt à nous rejoindre ?", ar: "هل أنت مستعد للانضمام إلينا؟" },
  "Book a trial session and see what Football Skills Academy is about.": {
    fr: "Réservez une séance d'essai et découvrez Football Skills Academy.",
    ar: "احجز حصة تجريبية واكتشف أكاديمية Football Skills Academy.",
  },

  // ---------------- Landing sections: who-we-are ----------------
  "Football Programmes\nBuilt Around Development": {
    fr: "Des programmes de football\ncentrés sur le développement",
    ar: "برامج كروية\nمبنية على التطوير",
  },
  "We exist to help every player reach their potential — on the pitch and off it.": {
    fr: "Nous existons pour aider chaque joueur à atteindre son potentiel, sur le terrain comme en dehors.",
    ar: "نحن هنا لمساعدة كل لاعب على بلوغ إمكاناته، داخل الملعب وخارجه.",
  },
  "Our story": { fr: "Notre histoire", ar: "قصتنا" },
  "Founded on one simple idea": { fr: "Née d'une idée simple", ar: "وُلدت من فكرة بسيطة" },
  "Football Skills Academy was founded to give every young player — regardless of starting ability — access to structured, high-quality coaching. We believe development takes time, and that the best results come from a clear, age-appropriate pathway rather than shortcuts.": {
    fr: "Football Skills Academy a été fondée pour donner à chaque jeune joueur, quel que soit son niveau de départ, accès à un encadrement structuré et de qualité. Nous croyons que la progression demande du temps, et que les meilleurs résultats viennent d'un parcours clair et adapté à l'âge, plutôt que de raccourcis.",
    ar: "تأسست أكاديمية Football Skills Academy لتتيح لكل لاعب شاب، أياً كان مستواه في البداية، تأطيراً منظّماً وعالي الجودة. نؤمن بأن التطور يحتاج وقتاً، وأن أفضل النتائج تأتي من مسار واضح يناسب كل مرحلة عمرية، لا من الطرق المختصرة.",
  },
  "What makes us different": { fr: "Ce qui nous distingue", ar: "ما الذي يميّزنا" },
  "Long-term development": { fr: "Développement sur la durée", ar: "تطوير على المدى الطويل" },
  "Every session is planned around a multi-year pathway, not just the next match.": {
    fr: "Chaque séance s'inscrit dans un parcours pluriannuel, et pas seulement dans la préparation du prochain match.",
    ar: "كل حصة تُخطَّط ضمن مسار يمتد لسنوات، لا استعداداً للمباراة المقبلة وحدها.",
  },
  "Safeguarding first": { fr: "La protection avant tout", ar: "الحماية أولاً" },
  "Fully vetted coaches and a comprehensive safeguarding policy at every venue.": {
    fr: "Des entraîneurs rigoureusement vérifiés et une politique de protection complète sur chaque site.",
    ar: "مدربون خاضعون للتدقيق الكامل وسياسة حماية شاملة في كل موقع.",
  },
  "Inclusive environment": { fr: "Un environnement inclusif", ar: "بيئة شاملة" },
  "All abilities are welcome — our job is to help every player improve from where they are.": {
    fr: "Tous les niveaux sont les bienvenus — notre rôle est d'aider chaque joueur à progresser depuis son point de départ.",
    ar: "نرحّب بكل المستويات — مهمتنا أن نساعد كل لاعب على التقدّم انطلاقاً من حيث هو.",
  },
  "Coaching standards": { fr: "Des standards d'encadrement", ar: "معايير التأطير" },
  "A single academy-wide coaching philosophy, consistently delivered across all venues.": {
    fr: "Une philosophie d'encadrement unique à l'académie, appliquée de la même façon sur tous les sites.",
    ar: "فلسفة تدريب واحدة على مستوى الأكاديمية، تُطبَّق بالطريقة نفسها في جميع المواقع.",
  },
  "Find your programme": { fr: "Trouvez votre programme", ar: "اعثر على برنامجك" },
  "Explore our programmes and find the right fit for your player.": {
    fr: "Parcourez nos programmes et trouvez celui qui convient à votre joueur.",
    ar: "تصفّح برامجنا واختر الأنسب للاعبك.",
  },

  // ---------------- Landing sections: methodology ----------------
  "A single coaching philosophy, applied consistently across every age group and venue.": {
    fr: "Une philosophie d'encadrement unique, appliquée de la même façon à chaque catégorie d'âge et sur chaque site.",
    ar: "فلسفة تدريب واحدة، تُطبَّق بالطريقة نفسها في كل فئة عمرية وكل موقع.",
  },
  "Developing the whole player": {
    fr: "Développer le joueur dans sa globalité",
    ar: "تطوير اللاعب في جميع جوانبه",
  },
  "<p>We coach five interconnected areas of player development: technical, tactical, physical, psychological and social. Sessions are designed around realistic game situations using constraints-based coaching — putting players in scenarios that force them to make decisions, rather than simply repeating drills.</p>": {
    fr: "<p>Nous travaillons cinq domaines interconnectés du développement du joueur : technique, tactique, physique, psychologique et social. Les séances sont construites autour de situations de jeu réalistes, selon une approche par contraintes — placer le joueur dans des scénarios qui l'obligent à décider, plutôt que répéter des exercices isolés.</p>",
    ar: "<p>نعمل على خمسة مجالات مترابطة في تطوير اللاعب: التقني، والتكتيكي، والبدني، والنفسي، والاجتماعي. تُبنى الحصص حول وضعيات لعب واقعية وفق منهج قائم على القيود — أي وضع اللاعب في مواقف تفرض عليه اتخاذ القرار، بدل تكرار تمارين معزولة.</p>",
  },
  "The five pillars": { fr: "Les cinq piliers", ar: "الركائز الخمس" },
  Technical: { fr: "Technique", ar: "التقني" },
  "Ball mastery, passing, receiving and finishing built through repetition in game-realistic situations.": {
    fr: "Maîtrise du ballon, passe, contrôle et finition, travaillés par la répétition dans des situations proches du jeu.",
    ar: "التحكم في الكرة والتمرير والاستقبال والإنهاء، تُبنى بالتكرار ضمن وضعيات قريبة من اللعب الحقيقي.",
  },
  Tactical: { fr: "Tactique", ar: "التكتيكي" },
  "Understanding roles, formations and decision-making appropriate to each age group.": {
    fr: "Compréhension des rôles, des systèmes de jeu et de la prise de décision adaptée à chaque catégorie d'âge.",
    ar: "فهم الأدوار وأنظمة اللعب واتخاذ القرار بما يناسب كل فئة عمرية.",
  },
  Physical: { fr: "Physique", ar: "البدني" },
  "Age-appropriate athletic development including speed, agility and coordination.": {
    fr: "Un développement athlétique adapté à l'âge : vitesse, agilité et coordination.",
    ar: "تطوير بدني يناسب السن: السرعة والرشاقة والتناسق الحركي.",
  },
  Psychological: { fr: "Psychologique", ar: "النفسي" },
  "Confidence, resilience and the ability to make decisions under pressure.": {
    fr: "Confiance, résilience et capacité à décider sous pression.",
    ar: "الثقة والقدرة على تجاوز الصعوبات واتخاذ القرار تحت الضغط.",
  },
  Social: { fr: "Social", ar: "الاجتماعي" },
  "Teamwork, communication and what it means to support your teammates.": {
    fr: "Travail d'équipe, communication et sens du soutien à ses coéquipiers.",
    ar: "العمل الجماعي والتواصل ومعنى مساندة الزملاء.",
  },
  "See our pathway in action": {
    fr: "Découvrez notre parcours en pratique",
    ar: "شاهد مسارنا على أرض الواقع",
  },

  // ---------------- Landing sections: pathway ----------------
  "The Player Pathway": { fr: "Le parcours du joueur", ar: "مسار اللاعب" },
  "A clear route from a player's first session through to competitive Development Squad football.": {
    fr: "Un chemin clair, de la première séance jusqu'au football de compétition en équipe de développement.",
    ar: "طريق واضح، من الحصة الأولى إلى كرة القدم التنافسية ضمن فرق التطوير.",
  },
  "<p>Every player progresses through our pathway at their own pace, guided by ongoing assessment from our coaching team. Progression is based on ability and attitude, not just age.</p>": {
    fr: "<p>Chaque joueur avance dans le parcours à son rythme, accompagné par l'évaluation continue de notre équipe d'encadrement. La progression repose sur le niveau et l'état d'esprit, pas uniquement sur l'âge.</p>",
    ar: "<p>يتقدّم كل لاعب في المسار وفق وتيرته الخاصة، بمتابعة وتقييم مستمرَّين من طاقمنا التدريبي. ويقوم التدرّج على المستوى والانضباط، لا على السن وحده.</p>",
  },
  "Ready to start the journey?": {
    fr: "Prêt à commencer l'aventure ?",
    ar: "هل أنت مستعد لبدء الرحلة؟",
  },

  // ---------------- Per-locale columns added 2026-08-23 ----------------
  // These eight tables were single-language until the locale columns landed.
  // LandingPage metadata is keyed on its French value, not English: the base
  // column was rewritten to French earlier (it is the default locale, and the
  // column had to hold something a French visitor could read).
  "Football Skills Academy — Entraîne-toi, rivalise, progresse": {
    fr: "Football Skills Academy — Entraîne-toi, rivalise, progresse",
    ar: "Football Skills Academy — تدرّب، نافس، تطوّر",
  },
  "Football Skills Academy propose des programmes à l'année, des stages de vacances et des équipes de développement pour les joueurs de 6 à 16 ans, encadrés par des entraîneurs qualifiés sur tous nos sites.": {
    fr: "Football Skills Academy propose des programmes à l'année, des stages de vacances et des équipes de développement pour les joueurs de 6 à 16 ans, encadrés par des entraîneurs qualifiés sur tous nos sites.",
    ar: "تقدّم أكاديمية Football Skills Academy برامج على مدار السنة وتربّصات للعطل وفرق تطوير للاعبين من 6 إلى 16 سنة، بإشراف مدربين مؤهَّلين في جميع مواقعنا.",
  },
  "Qui sommes-nous | Football Skills Academy": {
    fr: "Qui sommes-nous | Football Skills Academy",
    ar: "من نحن | Football Skills Academy",
  },
  "Football Skills Academy repose sur le développement du joueur sur la durée, un encadrement qualifié et un environnement sûr et inclusif pour chacun.": {
    fr: "Football Skills Academy repose sur le développement du joueur sur la durée, un encadrement qualifié et un environnement sûr et inclusif pour chacun.",
    ar: "تقوم أكاديمية Football Skills Academy على تطوير اللاعب على المدى الطويل، وتأطير مؤهَّل، وبيئة آمنة وشاملة للجميع.",
  },
  "Méthodologie | Football Skills Academy": {
    fr: "Méthodologie | Football Skills Academy",
    ar: "منهجيتنا | Football Skills Academy",
  },
  "Notre méthodologie développe les compétences techniques, tactiques, physiques, psychologiques et sociales à travers des séances adaptées à l'âge et construites par contraintes.": {
    fr: "Notre méthodologie développe les compétences techniques, tactiques, physiques, psychologiques et sociales à travers des séances adaptées à l'âge et construites par contraintes.",
    ar: "تطوّر منهجيتنا المهارات التقنية والتكتيكية والبدنية والنفسية والاجتماعية عبر حصص تناسب كل فئة عمرية وتُبنى على وضعيات اللعب.",
  },
  "Parcours du joueur | Football Skills Academy": {
    fr: "Parcours du joueur | Football Skills Academy",
    ar: "مسار اللاعب | Football Skills Academy",
  },
  "De la formation initiale aux équipes de développement — un parcours clair et adapté à l'âge pour chaque joueur de Football Skills Academy.": {
    fr: "De la formation initiale aux équipes de développement — un parcours clair et adapté à l'âge pour chaque joueur de Football Skills Academy.",
    ar: "من التكوين الأولي إلى فرق التطوير — مسار واضح يناسب كل مرحلة عمرية لكل لاعب في أكاديمية Football Skills Academy.",
  },

  // Subscription plans — rendered in the public pricing cards.
  Monthly: { fr: "Mensuel", ar: "شهري" },
  "Monthly membership plan": { fr: "Abonnement mensuel", ar: "اشتراك شهري" },
  "Half Yearly": { fr: "Semestriel", ar: "نصف سنوي" },
  "6 months membership — 10% discount": {
    fr: "Abonnement de 6 mois — 10 % de réduction",
    ar: "اشتراك لستة أشهر — خصم 10٪",
  },
  Annual: { fr: "Annuel", ar: "سنوي" },
  "Full year membership — best value!": {
    fr: "Abonnement d'un an — la meilleure offre !",
    ar: "اشتراك لسنة كاملة — أفضل قيمة!",
  },

  // Admin-built form fields.
  "Full Name": { fr: "Nom complet", ar: "الاسم الكامل" },
  "Your full name": { fr: "Votre nom complet", ar: "اسمك الكامل" },
  Phone: { fr: "Téléphone", ar: "الهاتف" },
  "+213 ...": { fr: "+213 ...", ar: "+213 ..." },
  Address: { fr: "Adresse", ar: "العنوان" },
  "Street, neighborhood": { fr: "Rue, quartier", ar: "الشارع، الحي" },
  City: { fr: "Ville", ar: "المدينة" },
  "Your city": { fr: "Votre ville", ar: "مدينتك" },
  "Region/Wilaya": { fr: "Wilaya", ar: "الولاية" },
  Wilaya: { fr: "Wilaya", ar: "الولاية" },
  Notes: { fr: "Notes", ar: "ملاحظات" },
  "Any special instructions...": {
    fr: "Instructions particulières…",
    ar: "أي تعليمات خاصة…",
  },

  // ---------------- Page & programme SEO, English base ----------------
  // These rows were seeded before the locale columns existed, so their base
  // column still holds English. The French-keyed entries above cover pages
  // whose base was later rewritten to French; these cover the ones that never
  // were.
  "Football Skills Academy — Train, Compete, Grow": {
    fr: "Football Skills Academy — Entraîne-toi, rivalise, progresse",
    ar: "Football Skills Academy — تدرّب، نافس، تطوّر",
  },
  "Football Skills Academy runs year-round programmes, holiday courses and development squads for players aged 6-16, delivered by qualified coaches across our venues.": {
    fr: "Football Skills Academy propose des programmes à l'année, des stages de vacances et des équipes de développement pour les joueurs de 6 à 16 ans, encadrés par des entraîneurs qualifiés sur tous nos sites.",
    ar: "تقدّم أكاديمية Football Skills Academy برامج على مدار السنة وتربّصات للعطل وفرق تطوير للاعبين من 6 إلى 16 سنة، بإشراف مدربين مؤهَّلين في جميع مواقعنا.",
  },
  "Who We Are | Football Skills Academy": {
    fr: "Qui sommes-nous | Football Skills Academy",
    ar: "من نحن | Football Skills Academy",
  },
  "Football Skills Academy is built around long-term player development, qualified coaching and a safe, inclusive environment for every player.": {
    fr: "Football Skills Academy repose sur le développement du joueur sur la durée, un encadrement qualifié et un environnement sûr et inclusif pour chacun.",
    ar: "تقوم أكاديمية Football Skills Academy على تطوير اللاعب على المدى الطويل، وتأطير مؤهَّل، وبيئة آمنة وشاملة للجميع.",
  },
  "Methodology | Football Skills Academy": {
    fr: "Méthodologie | Football Skills Academy",
    ar: "منهجيتنا | Football Skills Academy",
  },
  "Our coaching methodology develops technical, tactical, physical, psychological and social skills through age-appropriate, constraints-based sessions.": {
    fr: "Notre méthodologie développe les compétences techniques, tactiques, physiques, psychologiques et sociales à travers des séances adaptées à l'âge et construites par contraintes.",
    ar: "تطوّر منهجيتنا المهارات التقنية والتكتيكية والبدنية والنفسية والاجتماعية عبر حصص تناسب كل فئة عمرية وتُبنى على وضعيات اللعب.",
  },
  "Player Pathway | Football Skills Academy": {
    fr: "Parcours du joueur | Football Skills Academy",
    ar: "مسار اللاعب | Football Skills Academy",
  },
  "From Foundation to Development Squads — a clear, age-based pathway for every Football Skills Academy player.": {
    fr: "De la formation initiale aux équipes de développement — un parcours clair et adapté à l'âge pour chaque joueur de Football Skills Academy.",
    ar: "من التكوين الأولي إلى فرق التطوير — مسار واضح يناسب كل مرحلة عمرية لكل لاعب في أكاديمية Football Skills Academy.",
  },
  "Football School | Football Skills Academy": {
    fr: "École de Football | Football Skills Academy",
    ar: "مدرسة كرة القدم | Football Skills Academy",
  },
  "Weekly football training for players aged 6-16, delivered by qualified coaches at Football Skills Academy.": {
    fr: "Entraînement de football hebdomadaire pour les joueurs de 6 à 16 ans, encadré par des entraîneurs qualifiés à Football Skills Academy.",
    ar: "تدريب كروي أسبوعي للاعبين من 6 إلى 16 سنة، بإشراف مدربين مؤهَّلين في أكاديمية Football Skills Academy.",
  },
  "Holiday Football Camp | Football Skills Academy": {
    fr: "Stage de Football | Football Skills Academy",
    ar: "تربّص كرة القدم | Football Skills Academy",
  },
  "A week of intensive football training and match play during the school holidays for players aged 6-16.": {
    fr: "Une semaine d'entraînement intensif et de matchs pendant les vacances scolaires, pour les joueurs de 6 à 16 ans.",
    ar: "أسبوع من التدريب المكثّف والمباريات خلال العطلة المدرسية، للاعبين من 6 إلى 16 سنة.",
  },

  // ---------------- News article bodies ----------------
  "<p>We're excited to launch our redesigned website — a single place to explore our programmes, find your nearest venue, and register interest in our Development Squads.</p><p>Whether your player is just starting out or ready for the next step, our team is here to help you find the right fit.</p>": {
    fr: "<p>Nous sommes ravis de lancer notre nouveau site — un seul endroit pour découvrir nos programmes, trouver le site le plus proche de chez vous et manifester votre intérêt pour nos équipes de développement.</p><p>Que votre joueur débute ou soit prêt pour l'étape suivante, notre équipe est là pour vous aider à trouver la formule qui lui convient.</p>",
    ar: "<p>يسعدنا إطلاق موقعنا الجديد — مكان واحد لاستكشاف برامجنا، والعثور على أقرب موقع إليك، وتسجيل اهتمامك بفرق التطوير لدينا.</p><p>سواء كان لاعبك في بدايته أو جاهزاً للخطوة التالية، فريقنا هنا لمساعدتك على اختيار الصيغة المناسبة.</p>",
  },
  "<p>Registration is now open for our next Holiday Football Camp. Places are limited, so early registration is recommended.</p><p>See the Programmes page for full pricing and schedule details.</p>": {
    fr: "<p>Les inscriptions sont ouvertes pour notre prochain stage de football. Les places sont limitées : il est conseillé de s'inscrire tôt.</p><p>Consultez la page Programmes pour le détail des tarifs et du planning.</p>",
    ar: "<p>فُتح باب التسجيل في تربّص كرة القدم القادم. الأماكن محدودة، لذا يُنصح بالتسجيل مبكراً.</p><p>راجع صفحة البرامج للاطلاع على الأسعار والجدول كاملاً.</p>",
  },

  // ---------------- Split-content bullet points & gallery captions ----------------
  "Qualified, DBS-checked coaches at every session": {
    fr: "Des entraîneurs qualifiés et vérifiés à chaque séance",
    ar: "مدربون مؤهَّلون ومدقَّق في سوابقهم في كل حصة",
  },
  "Small coaching ratios across all age groups": {
    fr: "Un encadrement en petits groupes pour tous les âges",
    ar: "تأطير ضمن مجموعات صغيرة لجميع الأعمار",
  },
  "A clear pathway from Foundation to Development Squads": {
    fr: "Un parcours clair, de la base aux équipes de développement",
    ar: "مسار واضح من مرحلة التأسيس إلى فرق التطوير",
  },
  "Inside the academy": { fr: "Au cœur de l'académie", ar: "من داخل الأكاديمية" },
  "Ball control": { fr: "Contrôle de balle", ar: "التحكم بالكرة" },
  "Speed & agility": { fr: "Vitesse et agilité", ar: "السرعة والرشاقة" },
  "Dribbling drills": { fr: "Exercices de dribble", ar: "تمارين المراوغة" },
  "First touch": { fr: "Première touche", ar: "اللمسة الأولى" },
  "On the training ground": { fr: "Sur le terrain d'entraînement", ar: "في ميدان التدريب" },
  "Squad tour": { fr: "Tournée de l'équipe", ar: "جولة الفريق" },

  // ---------------- Venue facilities (a JSON list, one label per entry) ----------------
  "3 full-size pitches": { fr: "3 terrains grand format", ar: "3 ملاعب بالحجم الكامل" },
  "2 full-size pitches": { fr: "2 terrains grand format", ar: "ملعبان بالحجم الكامل" },
  "4 pitches": { fr: "4 terrains", ar: "4 ملاعب" },
  "Indoor training hall": { fr: "Salle d'entraînement couverte", ar: "قاعة تدريب مغطّاة" },
  "Floodlit 5-a-side courts": { fr: "Terrains de foot à 5 éclairés", ar: "ملاعب خماسية مضاءة" },
  "Clubhouse & changing rooms": { fr: "Club-house et vestiaires", ar: "نادٍ وغرف تبديل الملابس" },
  "Parking on site": { fr: "Parking sur place", ar: "موقف سيارات في المكان" },
  "Spectator area": { fr: "Espace spectateurs", ar: "فضاء للمتفرّجين" },
  Gym: { fr: "Salle de musculation", ar: "قاعة رياضية" },
  "Meeting rooms": { fr: "Salles de réunion", ar: "قاعات اجتماعات" },

  // ---------------- Location names ----------------
  // Cities keep their French spelling (that *is* the French name) and take the
  // Arabic exonym; the demo venues get a translated descriptor.
  Alger: { fr: "Alger", ar: "الجزائر" },
  Oran: { fr: "Oran", ar: "وهران" },
  Constantine: { fr: "Constantine", ar: "قسنطينة" },
  "City Football Academy": { fr: "City Football Academy", ar: "أكاديمية المدينة لكرة القدم" },
  "Riverside Training Centre": { fr: "Centre d'entraînement Riverside", ar: "مركز ريفرسايد للتدريب" },
  "Northside Sports Complex": { fr: "Complexe sportif Northside", ar: "مركّب نورثسايد الرياضي" },

  // ---------------- Homepage copy, original seed wording ----------------
  // The homepage was reworded after production was seeded ("Players Trained"
  // is "Players trained" today, "Ready to join us?" is "Ready to join?"), so
  // an install from that era needs the older spellings keyed too. Where its
  // French survives, the BY_FR fallback would catch these anyway; keying them
  // means a row that lost even its French still resolves.
  "Players Trained": { fr: "Joueurs formés", ar: "لاعبون تدرّبوا لدينا" },
  "Years of Coaching": { fr: "Années d'encadrement", ar: "سنوات من التأطير" },
  "Qualified Coaches": { fr: "Entraîneurs qualifiés", ar: "مدربون مؤهَّلون" },
  "Built for long-term player development": {
    fr: "Pensé pour le développement du joueur sur la durée",
    ar: "مصمَّم لتطوير اللاعب على المدى الطويل",
  },
  "Expert Coaching": { fr: "Coaching expert", ar: "تأطير متخصّص" },
  "Team Spirit": { fr: "Esprit d'équipe", ar: "روح الفريق" },
  "Safe Environment": { fr: "Environnement sûr", ar: "بيئة آمنة" },
  "Modern Methodology": { fr: "Méthodologie moderne", ar: "منهجية حديثة" },
  "Competitive Pathway": { fr: "Parcours compétitif", ar: "مسار تنافسي" },
  "Real Progress": { fr: "Vraie progression", ar: "تقدّم حقيقي" },
  "Ready to join us?": { fr: "Prêt à nous rejoindre ?", ar: "هل أنت مستعد للانضمام إلينا؟" },

  // The homepage stat label. Its base was "Training Venues" when production was
  // seeded and is plain "Venues" today — and bare "Venues" is already spoken
  // for above by the nav item, whose French is the shorter "Sites". Keying the
  // original wording is what reaches the rows that actually need it.
  "Training Venues": { fr: "Sites d'entraînement", ar: "مواقع التدريب" },

  // ---------------- Schedule slot labels ----------------
  "Under 8": { fr: "Moins de 8 ans", ar: "أقل من 8 سنوات" },
  "Under 10": { fr: "Moins de 10 ans", ar: "أقل من 10 سنوات" },
  "Under 12": { fr: "Moins de 12 ans", ar: "أقل من 12 سنة" },
  "Under 14": { fr: "Moins de 14 ans", ar: "أقل من 14 سنة" },
  "Under 16": { fr: "Moins de 16 ans", ar: "أقل من 16 سنة" },
  Skills: { fr: "Technique", ar: "المهارات" },
  "All ages": { fr: "Tous les âges", ar: "جميع الأعمار" },
  "Full day camp": { fr: "Stage à la journée", ar: "تربّص ليوم كامل" },

  // Footer copyright line.
  "© 2026 Football Skills Academy. All rights reserved.": {
    fr: "© 2026 Football Skills Academy. Tous droits réservés.",
    ar: "© 2026 Football Skills Academy. جميع الحقوق محفوظة.",
  },
};

/**
 * The same table, indexed by its French value.
 *
 * Rows seeded before the Arabic columns existed keep the English wording of
 * that older seed in their base column — wording that has since been edited
 * ("Players Trained" is now "Players trained", "Ready to join us?" is now
 * "Ready to join?"), so a lookup on the base misses. Their French, though, was
 * written from the same source as this table and still matches exactly. So a
 * base miss falls through to the French value before giving up, which fills the
 * Arabic on every row an editor had already translated into French.
 *
 * First entry wins on a duplicate French value, matching the base-keyed table's
 * "translate a repeated phrase once" behaviour.
 */
const BY_FR: Record<string, Pair> = {};
for (const pair of Object.values(T)) if (!(pair.fr in BY_FR)) BY_FR[pair.fr] = pair;

/** Fields that carry translatable copy inside a LandingSection content blob. */
const SECTION_FIELDS = [
  "heading",
  "subheading",
  "body",
  "html",
  "ctaLabel",
  "secondaryCtaLabel",
  "eyebrow",
  "title",
  "label",
  // Nested in `bulletPoints[]` and `images[]` — reached by the recursive walk.
  "text",
  "caption",
];

const filled: string[] = [];
const untranslated = new Set<string>();

/** Returns the patch needed to fill whichever of Fr/Ar is missing, or null. */
function fill(base: string | null, fr: unknown, ar: unknown, field: string, where: string) {
  if (!base || !base.trim()) return null;
  if (fr && ar) return null;
  const pair =
    T[base] ??
    T[base.trim()] ??
    (typeof fr === "string" && fr ? BY_FR[fr] ?? BY_FR[fr.trim()] : undefined);
  if (!pair) {
    untranslated.add(`${where}.${field} :: ${base.replace(/\s+/g, " ").slice(0, 80)}`);
    return null;
  }
  const patch: Record<string, string> = {};
  if (!fr) patch[`${field}Fr`] = pair.fr;
  if (!ar) patch[`${field}Ar`] = pair.ar;
  filled.push(`${where}.${field} [${Object.keys(patch).map((k) => k.slice(-2).toLowerCase()).join("+")}]`);
  return patch;
}

/**
 * Station.facilities is a JSON array of short labels rather than one string, so
 * it is translated element by element.
 *
 * A locale's list is only written when *every* element resolved: a list where
 * half the bullets fell back to English would read worse than the French list
 * the ar -> fr chain already gives us.
 */
function fillJsonList(base: string | null, fr: unknown, ar: unknown, field: string, where: string) {
  if (!base) return null;
  if (fr && ar) return null;
  let items: unknown;
  try {
    items = JSON.parse(base);
  } catch {
    return null;
  }
  if (!Array.isArray(items) || items.length === 0) return null;
  const labels = items.filter((i): i is string => typeof i === "string");
  if (labels.length !== items.length) return null;

  const pairs = labels.map((l) => T[l] ?? T[l.trim()]);
  if (pairs.some((p) => !p)) {
    untranslated.add(`${where}.${field} :: ${labels.filter((l, i) => !pairs[i]).join(" | ").slice(0, 80)}`);
    return null;
  }
  const patch: Record<string, string> = {};
  if (!fr) patch[`${field}Fr`] = JSON.stringify(pairs.map((p) => p!.fr));
  if (!ar) patch[`${field}Ar`] = JSON.stringify(pairs.map((p) => p!.ar));
  filled.push(`${where}.${field} [${Object.keys(patch).map((k) => k.slice(-2).toLowerCase()).join("+")}]`);
  return patch;
}

async function main() {
  const { db } = await import("@/lib/db");

  /** Generic table walker for the field/fieldFr/fieldAr convention. */
  async function run(
    label: string,
    rows: any[],
    fields: string[],
    update: (id: string, data: Record<string, string>) => Promise<unknown>
  ) {
    for (const r of rows) {
      const data: Record<string, string> = {};
      for (const f of fields) {
        const patch = fill(r[f], r[`${f}Fr`], r[`${f}Ar`], f, `${label}/${r.slug ?? r.id.slice(0, 6)}`);
        if (patch) Object.assign(data, patch);
      }
      if (Object.keys(data).length && !DRY) await update(r.id, data);
    }
  }

  await run("Faq", await db.faq.findMany(), ["question", "answer"], (id, data) =>
    db.faq.update({ where: { id }, data })
  );
  await run(
    "PathwayLevel",
    await db.pathwayLevel.findMany(),
    ["name", "ageRangeLabel", "description", "entryRequirements", "objectives"],
    (id, data) => db.pathwayLevel.update({ where: { id }, data })
  );
  await run("HeaderNavItem", await db.headerNavItem.findMany(), ["label"], (id, data) =>
    db.headerNavItem.update({ where: { id }, data })
  );
  await run(
    "HeaderNavDropdownItem",
    await db.headerNavDropdownItem.findMany(),
    ["label", "description"],
    (id, data) => db.headerNavDropdownItem.update({ where: { id }, data })
  );
  await run("FooterLink", await db.footerLink.findMany(), ["label"], (id, data) =>
    db.footerLink.update({ where: { id }, data })
  );
  await run("FooterLinkColumn", await db.footerLinkColumn.findMany(), ["title"], (id, data) =>
    db.footerLinkColumn.update({ where: { id }, data })
  );
  await run("FooterBottomLink", await db.footerBottomLink.findMany(), ["label"], (id, data) =>
    db.footerBottomLink.update({ where: { id }, data })
  );
  await run("FooterConfig", await db.websiteFooterConfig.findMany(), ["tagline"], (id, data) =>
    db.websiteFooterConfig.update({ where: { id }, data })
  );
  await run("HeaderConfig", await db.websiteHeaderConfig.findMany(), ["ctaLabel"], (id, data) =>
    db.websiteHeaderConfig.update({ where: { id }, data })
  );
  await run(
    "NewsArticle",
    await db.newsArticle.findMany(),
    ["title", "excerpt", "body", "metaTitle", "metaDescription"],
    (id, data) => db.newsArticle.update({ where: { id }, data })
  );
  await run("NewsCategory", await db.newsCategory.findMany(), ["name"], (id, data) =>
    db.newsCategory.update({ where: { id }, data })
  );
  await run(
    "Programme",
    await db.programme.findMany(),
    ["name", "shortDescription", "fullDescription", "ageRangeLabel", "priceLabel", "promoBannerText", "metaTitle", "metaDescription"],
    (id, data) => db.programme.update({ where: { id }, data })
  );
  await run("ProgrammeCategory", await db.programmeCategory.findMany(), ["name"], (id, data) =>
    db.programmeCategory.update({ where: { id }, data })
  );
  await run("Coach", await db.coach.findMany(), ["role", "bio"], (id, data) =>
    db.coach.update({ where: { id }, data })
  );
  await run(
    "Station",
    await db.station.findMany(),
    ["name", "shortDescription", "fullDescription", "parkingInfo", "transportInfo", "accessibilityInfo"],
    (id, data) => db.station.update({ where: { id }, data })
  );
  for (const st of await db.station.findMany()) {
    const patch = fillJsonList(st.facilities, st.facilitiesFr, st.facilitiesAr, "facilities", `Station/${st.slug ?? st.id.slice(0, 6)}`);
    if (patch && !DRY) await db.station.update({ where: { id: st.id }, data: patch });
  }
  // Age group / session are admin-typed display copy on the public timetable.
  await run(
    "ScheduleSlot",
    await db.scheduleSlot.findMany(),
    ["ageGroup", "sessionName", "sessionType"],
    (id, data) => db.scheduleSlot.update({ where: { id }, data })
  );
  await run("WebsiteSlide", await db.websiteSlide.findMany(), ["title", "subtitle"], (id, data) =>
    db.websiteSlide.update({ where: { id }, data })
  );

  // Tables that gained per-locale columns in
  // prisma/migrations/20260823000002_public_content_locale_columns.
  await run(
    "LandingPage",
    await db.landingPage.findMany(),
    ["metaTitle", "metaDescription", "breadcrumbLabel"],
    (id, data) => db.landingPage.update({ where: { id }, data })
  );
  await run("SubscriptionPlan", await db.subscriptionPlan.findMany(), ["name", "description"], (id, data) =>
    db.subscriptionPlan.update({ where: { id }, data })
  );
  await run("Product", await db.product.findMany(), ["name", "description"], (id, data) =>
    db.product.update({ where: { id }, data })
  );
  await run("FormField", await db.formField.findMany(), ["label", "placeholder"], (id, data) =>
    db.formField.update({ where: { id }, data })
  );
  await run("FileRequirement", await db.fileRequirement.findMany(), ["title", "description"], (id, data) =>
    db.fileRequirement.update({ where: { id }, data })
  );
  await run("SummerCampPlan", await db.summerCampPlan.findMany(), ["name", "description"], (id, data) =>
    db.summerCampPlan.update({ where: { id }, data })
  );
  await run("SummerCampSession", await db.summerCampSession.findMany(), ["name", "description"], (id, data) =>
    db.summerCampSession.update({ where: { id }, data })
  );
  await run("WebsiteFooterConfig", await db.websiteFooterConfig.findMany(), ["copyrightText"], (id, data) =>
    db.websiteFooterConfig.update({ where: { id }, data })
  );

  // LandingSection.content is a JSON blob using the same convention, including
  // inside `cards[]` / `items[]` arrays, so it needs a recursive walk.
  const sections = await db.landingSection.findMany({ include: { landingPage: { select: { slug: true } } } });
  for (const sec of sections) {
    let content: Record<string, unknown>;
    try {
      content = JSON.parse(sec.content);
    } catch {
      continue;
    }
    let changed = false;
    const where = `LandingSection/${sec.landingPage?.slug ?? "?"}:${sec.type}`;

    const walk = (obj: Record<string, unknown>) => {
      for (const key of Object.keys(obj)) {
        if (key.endsWith("Fr") || key.endsWith("Ar")) continue;
        const val = obj[key];
        if (Array.isArray(val)) {
          for (const item of val) if (item && typeof item === "object") walk(item as Record<string, unknown>);
          continue;
        }
        if (typeof val !== "string" || !SECTION_FIELDS.includes(key)) continue;
        const patch = fill(val, obj[`${key}Fr`], obj[`${key}Ar`], key, where);
        if (patch) {
          Object.assign(obj, patch);
          changed = true;
        }
      }
    };
    walk(content);

    if (changed && !DRY) {
      await db.landingSection.update({ where: { id: sec.id }, data: { content: JSON.stringify(content) } });
    }
  }

  console.log(`${DRY ? "[dry run] would fill" : "filled"}: ${filled.length} field(s)`);
  for (const f of filled) console.log("   +", f);

  if (untranslated.size) {
    console.log(`\nno translation available for ${untranslated.size} value(s) — left untouched:`);
    for (const u of untranslated) console.log("   ?", u);
  }

  await db.$disconnect();
}

// Content translations must never be what breaks a deploy: the site renders
// (in French, via the ar -> fr fallback) whether or not this succeeds. Failures
// are logged loudly and the build carries on.
main().catch((error) => {
  console.error("⚠️  translation backfill failed — continuing:", error);
  process.exit(0);
});
