export interface DailySignItem {
  id: string;
  slug: string;
  title: string;
  category: 'Daily Needs & Food' | 'Responses & Agreement' | 'Actions & Movement' | 'Politeness & Social' | 'Family & People' | 'Inquiry & Expression';
  image: string;
  handshape: string;
  movement: string;
  meaning: string;
  examples: string[];
  color: string;
}

export const DAILY_SIGNS: DailySignItem[] = [
  {
    id: 'sign_yes',
    slug: 'yes',
    title: 'Yes',
    category: 'Responses & Agreement',
    image: '/signs/yes.jpg',
    handshape: 'Closed fist (S-handshape)',
    movement: 'Nod the fist up and down from the wrist like a nodding head.',
    meaning: 'Indicates affirmation, agreement, or confirmation.',
    examples: ['Yes, I understand.', 'Yes, that is correct.', 'Yes, please.'],
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30'
  },
  {
    id: 'sign_no',
    slug: 'no',
    title: 'No',
    category: 'Responses & Agreement',
    image: '/signs/no.jpg',
    handshape: 'Index and middle fingers extended with thumb underneath',
    movement: 'Snap index and middle fingers down quickly against the thumb like an emphatic negation.',
    meaning: 'Indicates refusal, denial, or negative response.',
    examples: ['No, thank you.', 'No, I am not ready yet.', 'No problem at all.'],
    color: 'from-rose-500/20 to-pink-500/10 border-rose-500/30'
  },
  {
    id: 'sign_toilet',
    slug: 'toilet',
    title: 'Toilet',
    category: 'Daily Needs & Food',
    image: '/signs/toilet.jpg',
    handshape: "Letter 'T' handshape (thumb tucked between index & middle knuckles)",
    movement: 'Shake the hand gently side-to-side from the wrist.',
    meaning: 'Requests bathroom or restroom access.',
    examples: ['Where is the toilet?', 'I need to use the toilet.', 'Please excuse me to the toilet.'],
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30'
  },
  {
    id: 'sign_go',
    slug: 'go',
    title: 'Go',
    category: 'Actions & Movement',
    image: '/signs/go.jpg',
    handshape: 'Index fingers pointing',
    movement: 'Point index fingers and roll them forward and outward away from the body.',
    meaning: 'Commands or indicates departure, leaving, or motion forward.',
    examples: ['Let us go now.', 'It is time to go.', 'Go ahead, please.'],
    color: 'from-amber-500/20 to-orange-500/10 border-amber-500/30'
  },
  {
    id: 'sign_eat',
    slug: 'eat',
    title: 'Eat',
    category: 'Daily Needs & Food',
    image: '/signs/eat.jpg',
    handshape: "Squished 'O' handshape with fingertips touching thumb",
    movement: 'Tap the fingertips repeatedly towards the mouth.',
    meaning: 'Expresses food, hunger, dining, or consuming meals.',
    examples: ['Time to eat lunch.', 'Would you like to eat?', 'I want to eat fruit.'],
    color: 'from-orange-500/20 to-amber-500/10 border-orange-500/30'
  },
  {
    id: 'sign_drink',
    slug: 'drink',
    title: 'Drink',
    category: 'Daily Needs & Food',
    image: '/signs/drink.jpg',
    handshape: "Curved 'C' handshape mimicking holding a cup or glass",
    movement: 'Tip the thumb and cup shape toward the mouth like taking a drink.',
    meaning: 'Requests a beverage or refers to drinking water or fluids.',
    examples: ['I would like a drink.', 'Please give me something to drink.', 'Drink some water.'],
    color: 'from-blue-500/20 to-indigo-500/10 border-blue-500/30'
  },
  {
    id: 'sign_stop',
    slug: 'stop',
    title: 'Stop',
    category: 'Actions & Movement',
    image: '/signs/stop.jpg',
    handshape: 'Flat open dominant hand with fingers together',
    movement: 'Chop the pinky edge of the dominant open hand sharply down into the open palm of the other hand.',
    meaning: 'Commands halting, ending an activity, or pausing.',
    examples: ['Please stop here.', 'Stop and listen.', 'Let us stop for a moment.'],
    color: 'from-red-500/20 to-rose-500/10 border-red-500/30'
  },
  {
    id: 'sign_all_done',
    slug: 'all_done',
    title: 'All Done',
    category: 'Actions & Movement',
    image: '/signs/all_done.jpg',
    handshape: 'Both open hands with fingers spread wide',
    movement: 'Start with palms facing inward and twist hands outward so palms face outward.',
    meaning: 'Signals completion, finishing a meal, or ending a task.',
    examples: ['I am all done with work.', 'Are you all done eating?', 'We are all done for today.'],
    color: 'from-purple-500/20 to-indigo-500/10 border-purple-500/30'
  },
  {
    id: 'sign_sit',
    slug: 'sit',
    title: 'Sit',
    category: 'Actions & Movement',
    image: '/signs/sit.jpg',
    handshape: "Both index and middle fingers bent into 'H/U' shapes",
    movement: 'Tap the two bent fingers of dominant hand down over the two bent fingers of non-dominant hand.',
    meaning: 'Requests someone to sit down or refers to seating.',
    examples: ['Please sit down here.', 'Sit with us.', 'Take a chair and sit.'],
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30'
  },
  {
    id: 'sign_open',
    slug: 'open',
    title: 'Open',
    category: 'Actions & Movement',
    image: '/signs/open.jpg',
    handshape: 'Both flat hands with palms facing inward together',
    movement: 'Swing both hands outward and apart like opening double doors.',
    meaning: 'Indicates opening a door, book, container, or beginning an event.',
    examples: ['Please open the door.', 'Open the window.', 'Open your book.'],
    color: 'from-teal-500/20 to-cyan-500/10 border-teal-500/30'
  },
  {
    id: 'sign_less',
    slug: 'less',
    title: 'Less',
    category: 'Actions & Movement',
    image: '/signs/less.jpg',
    handshape: 'Both flat hands held horizontally, dominant above non-dominant',
    movement: 'Lower the upper hand down closer to the bottom hand, shrinking the distance.',
    meaning: 'Signifies a smaller amount, decrease, reduction, or moderation.',
    examples: ['A little less, please.', 'I need less sugar.', 'Talk with less noise.'],
    color: 'from-sky-500/20 to-blue-500/10 border-sky-500/30'
  },
  {
    id: 'sign_more',
    slug: 'more',
    title: 'More',
    category: 'Actions & Movement',
    image: '/signs/more.jpg',
    handshape: "Both hands in flattened 'O' shapes with fingertips touching thumbs",
    movement: 'Bring the fingertips of both hands together and tap them repeatedly.',
    meaning: 'Requests additional food, help, information, or continuation.',
    examples: ['More please.', 'Can I have more water?', 'Tell me more about it.'],
    color: 'from-amber-500/20 to-yellow-500/10 border-amber-500/30'
  },
  {
    id: 'sign_thank_you',
    slug: 'thank_you',
    title: 'Thank You',
    category: 'Politeness & Social',
    image: '/signs/thank_you.jpg',
    handshape: 'Flat open hand with fingers together',
    movement: 'Touch fingertips to chin or lips and extend the hand forward toward the person.',
    meaning: 'Expresses gratitude, appreciation, and courtesy.',
    examples: ['Thank you very much.', 'Thank you for your assistance.', 'I appreciate that, thank you.'],
    color: 'from-emerald-500/20 to-teal-500/10 border-emerald-500/30'
  },
  {
    id: 'sign_water',
    slug: 'water',
    title: 'Water',
    category: 'Daily Needs & Food',
    image: '/signs/water.jpg',
    handshape: "'W' handshape with index, middle, and ring fingers extended",
    movement: 'Tap the side of the index finger against the chin twice.',
    meaning: 'Requests fresh drinking water or refers to water.',
    examples: ['I need a glass of water.', 'May I have water?', 'Drink warm water.'],
    color: 'from-cyan-500/20 to-blue-500/10 border-cyan-500/30'
  },
  {
    id: 'sign_mom',
    slug: 'mom',
    title: 'Mom',
    category: 'Family & People',
    image: '/signs/mom.jpg',
    handshape: 'Open 5-hand with fingers spread',
    movement: 'Tap the thumb tip gently against the chin twice.',
    meaning: 'Refers to mother, maternal figure, or mom.',
    examples: ['My mom is coming today.', 'Call mom on video.', 'Mom is helping me.'],
    color: 'from-pink-500/20 to-rose-500/10 border-pink-500/30'
  },
  {
    id: 'sign_dad',
    slug: 'dad',
    title: 'Dad',
    category: 'Family & People',
    image: '/signs/dad.jpg',
    handshape: 'Open 5-hand with fingers spread',
    movement: 'Tap the thumb tip gently against the forehead twice.',
    meaning: 'Refers to father, paternal figure, or dad.',
    examples: ['My dad is at home.', 'I spoke with dad.', 'Dad taught me sign language.'],
    color: 'from-indigo-500/20 to-blue-500/10 border-indigo-500/30'
  },
  {
    id: 'sign_please',
    slug: 'please',
    title: 'Please',
    category: 'Politeness & Social',
    image: '/signs/please.jpg',
    handshape: 'Flat open hand with fingers together',
    movement: 'Rub the flat palm in a gentle clockwise circle on the center of the chest.',
    meaning: 'Polite request, courtesy, and respect.',
    examples: ['Please help me.', 'Come here please.', 'Please pass the water.'],
    color: 'from-indigo-500/20 to-purple-500/10 border-indigo-500/30'
  },
  {
    id: 'sign_sorry',
    slug: 'sorry',
    title: 'Sorry',
    category: 'Politeness & Social',
    image: '/signs/sorry.jpg',
    handshape: "Closed fist ('A' handshape)",
    movement: 'Rub the fist in a circular motion over the chest.',
    meaning: 'Apology, regret, or sympathy.',
    examples: ['I am so sorry.', 'Sorry for the delay.', 'I am sorry to disturb you.'],
    color: 'from-amber-500/20 to-rose-500/10 border-amber-500/30'
  },
  {
    id: 'sign_help',
    slug: 'help',
    title: 'Help',
    category: 'Politeness & Social',
    image: '/signs/help.jpg',
    handshape: 'Dominant hand thumbs-up fist placed on flat non-dominant palm',
    movement: 'Lift both hands upward together, symbolizing lifting or assisting someone.',
    meaning: 'Urgent or polite request for assistance, aid, or support.',
    examples: ['Please help me.', 'Can I help you?', 'I need help with this.'],
    color: 'from-yellow-500/20 to-amber-500/10 border-yellow-500/30'
  },
  {
    id: 'sign_question',
    slug: 'question',
    title: 'Question',
    category: 'Inquiry & Expression',
    image: '/signs/question.jpg',
    handshape: 'Index finger drawing a hook in the air',
    movement: 'Start with index finger pointing up, then curl it into a hook question-mark shape.',
    meaning: 'Indicates asking a question, query, or needing clarification.',
    examples: ['I have a question.', 'May I ask a question?', 'Any questions so far?'],
    color: 'from-cyan-500/20 to-teal-500/10 border-cyan-500/30'
  },
  {
    id: 'sign_show_me',
    slug: 'show_me',
    title: 'Show Me',
    category: 'Inquiry & Expression',
    image: '/signs/show_me.jpg',
    handshape: 'Dominant index finger touching open non-dominant palm',
    movement: 'Touch the tip of dominant index finger to the palm and push both forward toward yourself/signer.',
    meaning: 'Requests demonstration, visual proof, or showing something.',
    examples: ['Show me how it works.', 'Please show me the sign.', 'Show me the picture.'],
    color: 'from-violet-500/20 to-purple-500/10 border-violet-500/30'
  },
  {
    id: 'sign_youre_welcome',
    slug: 'youre_welcome',
    title: "You're Welcome",
    category: 'Politeness & Social',
    image: '/signs/youre_welcome.jpg',
    handshape: 'Flat open hand starting near torso/chest',
    movement: 'Arc the open palm outward and down in a welcoming sweeping gesture.',
    meaning: "Polite reply to 'Thank you'.",
    examples: ['You are welcome!', 'You are very welcome, anytime.', 'Glad to help, you are welcome.'],
    color: 'from-emerald-500/20 to-cyan-500/10 border-emerald-500/30'
  },
  {
    id: 'sign_i_love_you',
    slug: 'i_love_you',
    title: 'I Love You',
    category: 'Inquiry & Expression',
    image: '/signs/i_love_you.jpg',
    handshape: "'ILY' handshape (thumb, index finger, and pinky finger extended, middle and ring curled)",
    movement: 'Hold the hand facing forward or press toward chest, expressing universal sign for love.',
    meaning: 'Universal sign expressing love, care, and deep affection.',
    examples: ['I love you always.', 'Sending you I love you sign.', 'I love you Mom and Dad.'],
    color: 'from-pink-500/20 to-rose-500/10 border-pink-500/30'
  },
  {
    id: 'sign_clean',
    slug: 'clean',
    title: 'Clean',
    category: 'Actions & Movement',
    image: '/signs/clean.jpg',
    handshape: 'Both flat open hands',
    movement: 'Slide the dominant flat palm smoothly forward across the stationary base palm.',
    meaning: 'Signifies cleanliness, tidying up, washing, or pureness.',
    examples: ['Keep the table clean.', 'Please clean your hands.', 'The room is very clean.'],
    color: 'from-teal-500/20 to-emerald-500/10 border-teal-500/30'
  }
];
