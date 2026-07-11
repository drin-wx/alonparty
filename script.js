/* =========================================================
   ALON PARTYLIST — MAIN SCRIPT LOGIC (COMPATIBLE & DYNAMIC)
========================================================= */

/* ---------------------------------------------------------
   1. CANVAS SKY ENGINE (3 Successive Sequential Waves + Animated Falling Stars)
--------------------------------------------------------- */
function initEngineCanvas(canvas, opts = {}) {
  const ctx = canvas.getContext('2d');
  let w, h, t = 0;
  let rafId;
  const stars = [];

  // 3 sequential waves depending on water current + custom configuration
  const layers = opts.layers || [
    { color: 'rgba(3, 69, 155, 0.6)',   amp: 35, len: 0.004, speed: 0.001, yFactor: 0.65 },
    { color: 'rgba(2, 130, 214, 0.4)',  amp: 25, len: 0.006, speed: 0.0015, yFactor: 0.73 },
    { color: 'rgba(0, 150, 255, 0.8)',  amp: 15, len: 0.008, speed: 0.002, yFactor: 0.82 }
  ];

  function resize() {
    if (!canvas || !canvas.parentElement) return;
    const rect = canvas.parentElement.getBoundingClientRect();
    w = canvas.width = rect.width * (window.devicePixelRatio || 1);
    h = canvas.height = rect.height * (window.devicePixelRatio || 1);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    
    // Falling White Diamonds/Stars Initialization
    if (opts.enableStars && stars.length === 0) {
      for (let i = 0; i < 40; i++) {
        stars.push({
          x: Math.random() * w,
          y: Math.random() * h,
          size: Math.random() * 2.5 + 1,
          speedY: Math.random() * 0.8 + 0.4,
          speedX: Math.random() * 0.2 - 0.1,
          alpha: Math.random() * 0.5 + 0.5
        });
      }
    }
  }
  window.addEventListener('resize', resize);
  resize();

  function drawStars() {
    stars.forEach(s => {
      // Dynamic falling animation down the screen with effects
      s.y += s.speedY;
      s.x += s.speedX;
      if (s.y > h) {
        s.y = -10;
        s.x = Math.random() * w;
      }
      ctx.fillStyle = `rgba(255, 255, 255, ${s.alpha})`;
      ctx.beginPath();
      // Sparkle diamond path
      ctx.moveTo(s.x, s.y - s.size);
      ctx.lineTo(s.x + s.size, s.y);
      ctx.lineTo(s.x, s.y + s.size);
      ctx.lineTo(s.x - s.size, s.y);
      ctx.closePath();
      ctx.fill();
    });
  }

  function drawLayer(layer) {
    ctx.beginPath();
    const baseY = h * layer.yFactor;
    ctx.moveTo(0, baseY);
    const dpr = window.devicePixelRatio || 1;
    for (let x = 0; x <= w; x += 8 * dpr) {
      const y = baseY + Math.sin(x * layer.len + t * layer.speed * 60) * layer.amp * dpr
                       + Math.sin(x * layer.len * 1.8 - t * layer.speed * 30) * (layer.amp * 0.25) * dpr;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    ctx.fillStyle = layer.color;
    ctx.fill();
  }

  function frame() {
    ctx.clearRect(0, 0, w, h);
    if (opts.enableStars) drawStars();
    layers.forEach(drawLayer);
    t += 1;
    rafId = requestAnimationFrame(frame);
  }
  frame();

  return { stop: () => cancelAnimationFrame(rafId) };
}

/* ---------------------------------------------------------
   2. INTRO TIMEOUT & AUTOPLAY ENGINE
--------------------------------------------------------- */
const introCanvas = document.getElementById('intro-canvas');
const introWave = initEngineCanvas(introCanvas, {
  enableStars: false,
  layers: [
    { color: 'rgba(3, 69, 155, 0.5)', amp: 25, len: 0.004, speed: 0.001, yFactor: 0.50 },
    { color: 'rgba(2, 130, 214, 0.4)', amp: 20, len: 0.006, speed: 0.0015, yFactor: 0.62 },
    { color: 'rgba(0, 150, 255, 0.6)', amp: 15, len: 0.008, speed: 0.002, yFactor: 0.75 }
  ]
});

const introEl = document.getElementById('intro');
const siteEl = document.getElementById('site');
const bgCanvas = document.getElementById('bg-canvas');
const bgMusic = document.getElementById('bg-music');
const musicBtn = document.getElementById('music-toggle-btn');
const ctrlIcon = document.getElementById('ctrl-icon');
let bgWave = null;
let candidatesGlobalData = [];

setTimeout(() => {
  introWave.stop();
  if (introEl) introEl.style.display = 'none'; 
  if (siteEl) siteEl.classList.remove('hidden');
  
  bgWave = initEngineCanvas(bgCanvas, {
    enableStars: true,
    layers: [
      { color: 'rgba(3, 69, 155, 0.2)',   amp: 30, len: 0.003, speed: 0.0008, yFactor: 0.75 },
      { color: 'rgba(2, 130, 214, 0.15)',  amp: 20, len: 0.005, speed: 0.0012, yFactor: 0.83 },
      { color: 'rgba(0, 150, 255, 0.25)',  amp: 12, len: 0.007, speed: 0.0018, yFactor: 0.90 }
    ]
  });

  if (bgMusic) {
    bgMusic.play().catch(() => {
      document.addEventListener('click', () => {
        if(bgMusic.paused) bgMusic.play();
      }, { once: true });
    });
  }
}, 3500);

if (musicBtn && bgMusic) {
  musicBtn.addEventListener('click', () => {
    if (bgMusic.paused) {
      bgMusic.play();
      ctrlIcon.innerHTML = `<path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>`;
    } else {
      bgMusic.pause();
      ctrlIcon.innerHTML = `<path d="M8 5v14l11-7z"/>`;
    }
  });
}

/* ---------------------------------------------------------
   3. CANDIDATES DATA LOADER (JSON Link Connectivity)
--------------------------------------------------------- */
// Maaari mong palitan ang URL string na ito kung may live link na ibibigay ang provider
const JSON_LINK = "candidates_data.json"; 

async function loadCandidates() {
  try {
    let response = await fetch(JSON_LINK);
    if (!response.ok) throw new Error("Local fetch failed, using internal payload.");
    let data = await response.json();
    renderCandidateSystem(data);
  } catch (err) {
    // Fallback data structure mula sa iyong Johnson payload
    const backupData = [
      { "id": 1, "position": "President", "full_name": "Aldrin Tamayo", "motto": "Isang pamumuno na may paninindigan at may bitaw.", "credentials": { "school_organizations": ["Quantum Vision as PIO (2025-2026)"], "non_profit_affiliations": ["929 Fire Rescue Volunteer and Radio Communication Group, Inc. (Chief Administrator, Radio Specialist, Medic)", "Cabuyao City Weather Information (Founder, Former Administrative Officer, Former Weather Forecaster)", "LagunaWISE (Founder, Former Administrative Officer, Former Head of Weather Division, Present Environmentalist)", "Balanghay Central (Quiapo, Manila) - Member", "Philippine Amateur Radio Association (PARA) - Member", "DX1E Elite Ham Radio Club San Pablo, Inc. - Member"], "youth_organizations": ["Kabataang Kaagapay ng Kabuyaw (KKK) - Former Member", "BANGKA (Bagong Alyansa ng Bagong Kabataan) - Officer", "929 YOUTH - Officer"], "licenses_and_certifications": ["Licensed Amateur Radio Operator (Call Sign: 4H1VCR, Licensed by NTC)"], "trainings_and_seminars": ["Bureau of Fire Protection (BFP) - Firefighting Training", "Basic Life Support (BLS) - Emergency Medical Training", "Emergency Medical Technician (EMT) Training", "PARA / NTC - Amateur Radio Seminars and Technical Training Programs"] }, "platforms_and_advocacies": [ { "title": "Emergency Response and First Aid", "statement": "Every student should know how to save a life.", "details": "Free Basic First Aid training, CPR awareness, Emergency response teams, and Campus emergency response volunteers." }, { "title": "Disaster Resilience and Preparedness", "statement": "Building disaster-ready communities through education, technology, and volunteerism.", "details": "Regular DRRM seminars sa mga estudyante, Earthquake, fire, at evacuation drills, Emergency preparedness kits campaign, and Disaster volunteer training." }, { "title": "Student Health and Safety", "statement": "Healthy and Safe Students, Stronger Community.", "details": "Mental health awareness, First aid stations, Heat safety awareness, and Medical response during events." }, { "title": "Campus Safety and Violence Prevention", "statement": "Promoting a safe, respectful, and violence-free learning environment for every student.", "details": "School Safety Awareness Campaign, Anti-Bullying and Violence Prevention Program, Student Safety Committee, Anonymous Student Reporting System, and Strengthened Coordination with the Guidance Office, Student Discipline Office, and School Administration." }, { "title": "Youth Volunteerism", "statement": "Empowering youth to lead and serve.", "details": "Volunteer recruitment, Leadership training, Community outreach, and Volunteer corps." } ] },
      { "id": 2, "position": "Vice President", "full_name": "Anne Margarette A. Prudente", "motto": "Kasing lakas gaya ng alon, kasing tapang gaya ng alon, at higit na sa lahat, hindi aatras kahit kasing laki payan ng alon.", "credentials": { "academic_excellence": ["Grade 1 to 7 Academic Achiever", "Grade 8 to 10 With Honors", "Grade 11 Achievers"], "competitions_and_awards": ["Champion, 1st Placer, and 3rd Placer of Banay-Banay singing competition", "2nd placer of St. Ignatius (Buwan ng wika) singing competition", "G11 Yell Champion (STEM)", "G11 Field Demo Champion (STEM)"], "leadership_experience": ["Former President of Glee club organization (PNHS)", "Former P.I.O of St. Ignatius Chorale", "Former Vice President of Quantum Visions (STEM Club)"] }, "platforms_and_advocacies": [ { "title": "Eradication of Vaping on School Premises", "statement": "Upholding a healthy and disciplined environment.", "details": "First priority is to eliminate vaping on school premises to ensure a safe, healthy, and disciplined environment where students can focus on learning." }, { "title": "Action-Oriented Leadership", "statement": "Leaders who take action, not just make promises.", "details": "Facing every problem with courage, remaining calm under pressure, listening to concerns, and working diligently to provide practical and effective solutions." } ] },
      { "id": 3, "position": "Secretary", "full_name": "Malcy A. Cordova", "motto": "The things that you cannot do are not the things that defines you; find the purpose in your heart and nothing can stop you", "credentials": { "academic_excellence": ["Elementary (Grade 1-6) Academic Achiever / Top Student", "Junior High School Grade 7-9 Top Academic Achiever", "Grade 10 With Honors (92 Average)", "Senior High School Grade 11 With Honors (94 Average)"], "leadership_experience": ["Grade 1 Class President, Grade 2 & 5 Class Treasurer", "Grade 10 Protocol Officer, Secretary Representative/Volunteer for SSLG, President Representative/Volunteer for BKD", "Grade 11 Main Head and One of the Main Choreographers of St. Ignatius Diverse" ], "organizational_memberships": ["LGBTQIA+ Online Advocate", "Member, Babaylanes Organization", "Member, Lagablab LGBT Network", "Participant, SOGIESC Online Advocacy Campaigns"], "notable_achievements": ["Outstanding Student Award (Grade 1)", "5th Place, Anti-Bullying Theatre (Grade 3)", "Rank 7, MTAP Competition (Grade 3)", "Champion, Dress-Me Up United Nations (Grade 8) & 1st Place (Grade 9)", "Champion, English Month Spelling Bee (Grade 10, 2024), 2nd Placer (Grade 8, 2022)"] }, "platforms_and_advocacies": [ { "title": "Administrative Integrity and Accessibility", "statement": "Totoo, detalyado, at malinis na records.", "details": "Pangungunahan ang mga pagpupulong, pakikipag-ugnayan sa mga administrador, punong-guro, at pangulo ng paaralan na may malinis na gampanin." }, { "title": "M.M.A.I.T. Campaign against Bullying", "statement": "Mindfulness, Mutual-Respect, Acceptance, Inclusion, and Teamwork.", "details": "Itataguyod laban sa bullying at diskriminasyon para magkaroon ang mga estudyante ng ligtas at masayang komunidad." }, { "title": "Classroom and Clinic Facility Supply", "statement": "Pagsu-supply ng mga kakulangan sa gamit.", "details": "Magbibigay ng mga tissue sa CRs, mga marker at erasers sa mga silid-aralan, at mga napkins o first-aid kits sa clinic." } ] },
      { "id": 4, "position": "Treasurer", "full_name": "Isabel Nhicole M. Nierva", "motto": "Para mabago ang mundo, simulan mo ito sa sarili mo", "credentials": { "academic_excellence": ["Elementary Grade 2-6 Academic Achiever", "Junior High School Grade 8-10 With Honors", "Senior High School Grade 11 With Honors"], "leadership_experience": ["Grade 8 Homeroom Class Secretary, Grade 9 Homeroom PIO", "Grade 10 Homeroom Class Treasurer, Class Rep for Mathematics Club", "Former Senior Scout Alumni", "Grade 11 & 12 Homeroom Class Vice President, Treasurer for Solis Ignacia Chorale"], "notable_achievements": ["Champion, Sudoku Competition – Sci-Math Event (S.Y. 2025–2026)", "Participant, Environmental Camp (2024)"] }, "platforms_and_advocacies": [ { "title": "Transparency and Financial Accountability", "statement": "Ang pondo ng paaralan ay hindi para ibulsa o kaya'y itago.", "details": "Bawat piso na mahahawakan ay ilalagay sa malinis at organisadong record kasama ang mga resibo ng transactions. Paglalantad ng bawat resibo buwan-buwan." } ] },
      { "id": 5, "position": "Auditor", "full_name": "Kristelle Claire T. Amarante", "motto": "", "credentials": {}, "platforms_and_advocacies": [] },
      { "id": 6, "position": "Public Information Officer (PIO)", "full_name": "Justin Caleb H. Gillaco", "motto": "Hindi chismis, impormasyon", "credentials": { "academic_excellence": ["Consistent 1st Honor Student (Kindergarten & Grade 1)", "Junior High School Grade 7-10 With Honors", "Senior High School Grade 11 With High Honors"], "leadership_experience": ["Grade 2 & 8 Sgt. at Arms", "Grade 9, 10, 11, and 12 Class President", "YES-O Volunteer / Editor"], "notable_achievements": ["2nd Place National Folk Dance competition (Grade 3)", "Intramurals Champion on Scrabble (Grade 3)", "Sci-Math Quiz Bee Champion (Grade 11)"] }, "platforms_and_advocacies": [ { "title": "PROJECT CLEAR", "statement": "Isang tulay na mag-uugnay sa SSC at St. Ignatians.", "details": "Isang organisadong paraan ng pag-uulat ng mga proyekto, aktibidades, at mga pangyayaring nagaganap sa ating paaralan." }, { "title": "PROJECT BANTAY", "statement": "Financial transparency at accountability.", "details": "Katuwang ang ingat-yaman, irereport at isasapubliko ang paggastos ng Student Council sa pamamaraan ng monthly expenditure and spending reports." }, { "title": "PROJECT TAMA", "statement": "Digital Literacy Campaign upang buwagin ang misinformation.", "details": "Tuturuan ang mga Ignatians at sila’y gagabayan kung paano malaman kung alin ang totoo at hindi upang labanan ang fake news." }, { "title": "PROJECT GABAY", "statement": "Student awareness campaign laban sa bullying at para sa mental health.", "details": "Tutuunan ng pansin ang mga suliraning pampaaralan upang magsilbing gabay tungo sa mas kaaya-aya at mas inklusibong St. Ignatius." } ] },
      { "id": 7, "position": "Assistant Public Information Officer (PIO 2)", "full_name": "Jippey C. Napile", "motto": "Be the reason someone smiles today by encouraging kindness and positivity", "credentials": { "academic_excellence": ["Kinder Class Valedictorian", "Elementary Grade 1-6 With Honors / Top Rankings", "Junior High School Grade 7 With High Honors, Grade 8-10 With Honors", "Senior High School Grade 11 With High Honors"], "leadership_experience": ["Grade 5 Class Treasurer, Grade 8 Candidate for YES-O Auditor", "Grade 10 Class PIO, Grade 11 & 12 Class President", "Committee Member, DITA Youth Athletic Club (DYAC), Subject Leader"], "notable_achievements": ["Finalist, Poster Making Contest (Grade 4)", "1st Place, Science Quiz Bee (Grade 5)", "YES-O Volunteer (Grades 8 and 10)"] }, "platforms_and_advocacies": [ { "title": "BOSES MO, AKSYON KO", "statement": "Bawat Boses ay Mahalaga at Bawat Opinyon ay may Halaga.", "details": "Magkakaroon ng online at physical suggestion box pati regular student consultations na may follow-up at pag-update sa progress ng issues." } ] },
      { "id": 8, "position": "Peace Officer", "full_name": "Jetro Aser V. Laya", "motto": "The future belongs to those who prepare today", "credentials": { "academic_excellence": ["Junior High School Grade 8 Academic Achiever, Grade 9-10 With Honors", "Senior High School Grade 11 With Honors"], "leadership_experience": ["Grade 10, 11, and 12 Class President", "Grade 10 Representative for Barkada Kontra Droga (BKD)", "Grade 11 Protocol Officer for Quantum Vision"], "notable_achievements": ["Champion, Grade 11 STEM Yell Competition", "Overall Champion, Grade 11"] }, "platforms_and_advocacies": [ { "title": "Student Talent Engagement and Showcases", "statement": "Intelligence is also measured by the skills and talents we possess.", "details": "Encouraging talent showcases and creating activities based on student interests in a safe and trustworthy space." } ] },
      { "id": 9, "position": "Peace Officer 2", "full_name": "John Melvin Broce", "motto": "", "credentials": { "academic_excellence": ["Kindergarten Special Awards, Elementary Grade 1-4 With Honors, Grade 5-6 Academic Achiever", "Junior High School Grade 7-8 Academic Achiever (Best in English), Grade 9 With Honors, Grade 10 Academic Achiever"], "leadership_and_affiliations": ["Elementary Class VP (Grades 1-2), Secretary (Grade 3), Peace Officer (Grades 4-6)", "JHS Grade 8 Class VP, Grade 9 AP Club Board Member, BKD Representative Candidate", "Grade 10 Filipino Classroom Rep, Kinaadman Filipino Club Grade 10 Rep"], "notable_achievements": ["Journalism Service Awardee - Science and Technology Writing", "3rd Place & Champion - Men's Volleyball Intramurals", "2nd Place - CFOT Filmmaking"] }, "platforms_and_advocacies": [] },
      { "id": 10, "position": "Grade 11 Chairperson", "full_name": "Shabbie Nhiecole S. Biadoy", "motto": "You can’t win on everything but you can TRY", "credentials": { "academic_excellence": ["Elementary Grade 1 Consistent Top 1, Grade 2 Outstanding Student, Grade 3-6 Honors/Conduct Awards", "Junior High School Grade 7-10 With Honors & Academic Achiever"], "leadership_experience": ["Classroom Officer (Elementary), Grade 7-10 Classroom President", "Elected Auditor for YES-Organization (Batch 2024-2025)", "Grade 11 President, ASSH/HUMSS - PERU"], "notable_achievements": ["International Large-Scale Assessments (ILSA) Qualifier", "PISA Taker and Awardee", "2nd Place - Festival Dance (Grade 9)"] }, "platforms_and_advocacies": [ { "title": "Mental Health Awareness and Anti-Bullying", "statement": "Create a safe space where students can express thoughts without judgment.", "details": "To help them recognize their worth and remind them that they are loved, valued, and never alone through kindness and respect." } ] },
      { "id": 11, "position": "Grade 12 Chairperson", "full_name": "Johnselwyn L. Tomenio", "motto": "If you fail to plan , you plan to fail.", "credentials": { "academic_excellence": ["Elementary Grade 1-2 1st Honor, Grade 3-5 With Honors", "Junior High School Grade 7-10 With Honors", "Senior High School Grade 11 With High Honors"], "leadership_experience": ["Grade 1, 2, 3, 4, 5, 10, 11, and 12 Class President", "SPG Grade 3 Rep & Vice President", "Boy Scouts of the Philippines (BSP) Patrol Leader", "Grade 8 & 9 Class Vice President"], "notable_achievements": ["Rank 1, MTAP Competition (Grade 3)", "DSPC English News Writer (Grades 3 & 4)", "1st Place, Buwan ng Wika Slogan Making Contest (Grade 11)"] }, "platforms_and_advocacies": [ { "title": "Diversity, Equity, and Inclusivity", "statement": "Programs that celebrate everyone regardless of identity.", "details": "Creating a healthy school environment for emotional well-being regardless of gender identity, religion, and socio-economic status." }, { "title": "Environmental Sustainability and Green Campus", "statement": "Practicing the 3 Rs (Reduce, Reuse, Recycle).", "details": "Addressing improper waste disposal by tackling the ecological footprint of the campus to lead by example." }, { "title": "Transparency", "statement": "A good leader does not work in the shadow.", "details": "Informing, involving, and empowering students regarding the plan, budget, and ongoing processes of the Student Council." } ] },
      { "id": 12, "position": "Grade 11 STEM Representative", "full_name": "Brent Edrian N. Gonzales", "motto": "You Only Live Once, but if You do it right, Once is enough", "credentials": { "academic_excellence": ["Junior High School Grade 7-10 With Honors / High Honors"], "leadership_experience": ["Grade 7 & 8 Class Vice President, Grade 8 English Club Representative", "Grade 9 Class PIO, Grade 10 Class Secretary"], "sports_and_competitions": ["3rd Place & Champion - Men's Volleyball Intramurals", "Men's Volleyball City Meet Qualifier", "Participant, Mr. and Ms. Kalikasan (S.Y. 2024–2025)"] }, "platforms_and_advocacies": [ { "title": "Uplifting LGBTQ Community", "statement": "Achieve a Homophobic-Free community.", "details": "Ensuring a safe space free from discrimination, prejudice, and judgment inside the school premises." }, { "title": "Helping Students in Financial Need", "statement": "Financial stability affects academic performance.", "details": "Conducting classroom surveys to identify working or struggling students and allocating school donations/funds to support them." }, { "title": "Environmental Conservation & AI Awareness", "statement": "Spreading awareness on how overusage of AI affects water resources.", "details": "Educating STEM students that AI cooling servers consume millions of liters of clean drinking/mineral water, leading to potential future shortages." } ] },
      { "id": 13, "position": "Grade 11 HUMSS Representative", "full_name": "Avrian M. Silmaro", "motto": "Together, We Rise Like the Waves—Leading with Purpose, Serving with Heart.", "credentials": { "academic_excellence": ["Elementary Grade 1-2 & 6 High Honor, Grade 3-5 Honor", "Junior High School Grade 7-9 Honor, Grade 10 High Honor"], "leadership_experience": ["Head of Finance for Hakbang Kabataan (NGO), President of English Club & Library Club", "Auditor of Math Club, Class Secretary/Auditor/Treasurer roles", "SELG Grade 3 Auditor & Grade 4 PIO"], "notable_achievements": ["Participant in Infographic, Festival of Talents, Math/Sci/English Quiz Bees", "1st Place Reading Marathon, 3rd Place Math Quiz Bee"] }, "platforms_and_advocacies": [ { "title": "strand representation & open communication", "statement": "Empower every voice and make a meaningful difference.", "details": "Representing the strand with honesty and fairness under the ALON Partylist, communicating student concerns directly to council and teachers." } ] },
      { "id": 14, "position": "Grade 11 ABM Representative", "full_name": "Maica Unice G. Lirio", "motto": "It’s best to push forward despite the hardships", "credentials": { "academic_excellence": ["JHS Grade 7-10 With Honors with Exemplary Performance recognitions in Science and TLE/FBS"] }, "platforms_and_advocacies": [ { "title": "Kindness and Access to Cleaning Supplies", "statement": "Safer, comfortable campus free from bullying.", "details": "Voicing out those afraid to do it alone, adding cleaning supplies to each building with specific student-accessible storage." } ] },
      { "id": 15, "position": "Grade 11 HE Representative", "full_name": "Cristian Macalino", "motto": "Progress, not perfection.", "credentials": { "academic_excellence": ["JHS Grade 9-10 Academic Achiever"], "leadership_experience": ["Grade 8 & 9 Public Information Officer (P.I.O.) for MAPEH Club"], "school_service": ["School Event Escort (Grades 8–10)"] }, "platforms_and_advocacies": [ { "title": "WE ARE ALL WELCOME", "statement": "Strict anti-bullying rules, no judgment, no exclusion.", "details": "A safe home where every gender or identity is respected and every voice matters." }, { "title": "EQUIP EVERY NEED", "statement": "Push for complete tools and equipment for laboratories.", "details": "Ensuring enough consumables so that no student skips practices due to lack of laboratory materials." } ] },
      { "id": 16, "position": "Grade 11 ICT Representative", "full_name": "Janna Althea Cutin", "motto": "Every Sunset Is A Promise Of A New Sunrise — Kahit Gaano Kabigat Ngayon, May Bukas Pa.", "credentials": { "academic_excellence": ["Elementary Consistent Honor Student & Natatanging Mag-aaral", "JHS Grade 7 With Honors, Grade 8 Academic Achiever"], "leadership_experience": ["Class Secretary (Grades 3, 5, 11), Class VP (Grades 2, 7)", "Class PIO (Grades 9-10), SSLG Auditor, YES-O Staff", "Member of School Broadcasting, AP, Science Club, Drum and Lyre Band"], "notable_achievements": ["Senior Scout Awardee", "4th Place SSLG Nutrition Month Costume-Making Contest"] }, "platforms_and_advocacies": [ { "title": "ACADEMIC SUPPORT", "statement": "Tulungan, hindi paligsahan!", "details": "Providing access to reviewers, notes, and tips so that no student is left behind at the expense of mental health." }, { "title": "MENTAL HEALTH: MIND MATTERS!", "statement": "It's okay to not be okay, it's not okay to stay that way alone.", "details": "Promoting visual rest and psychological coping mechanisms during transitions to Senior High School." }, { "title": "FAITH AND HOPE: LIWANAG", "statement": "Verse of the week and Sunset Circle.", "details": "Once a month 10-minute post-class sharing, prayer, and reflection." }, { "title": "NO VAPING AND BULLYING", "statement": "Hinga, hindi vape; Protektahan ang dignidad ng bawat isa.", "details": "Zero tolerance for body shaming, name-calling, and vape smuggling checks to protect health and student dignity." } ] },
      { "id": 17, "position": "Grade 12 STEM Representative", "full_name": "Vacant / Not Provided", "motto": "", "credentials": {}, "platforms_and_advocacies": [] },
      { "id": 18, "position": "Grade 12 ICT Representative", "full_name": "Princess Louriz Alvarado", "motto": "Make Love as an Inspiration, But don't make it the reason to fail your Education.", "credentials": { "academic_excellence": ["Elementary Grade 1-6 Achiever / With Honors", "JHS Grade 7 & 9 With Honors, Grade 8 Achiever", "SHS Grade 11 With Honors"], "leadership_experience": ["Class Treasurer, Auditor, PIO across multiple grades", "YES-O Vice President (Grade 4)", "BKD Auditor, Secretary, and President (Grade 9)", "Mobile Journalist for The Ignite Express (Grade 11)"], "affiliations": ["Member of AP, Art, and English Clubs", "Tindig Kabataan: Lingkod ng Bayan Member", "Volunteer for Cabuyao Sports and Youth Development Office"] }, "platforms_and_advocacies": [ { "title": "Inclusivity of Interests", "statement": "Discover, explore, and train hidden potentials.", "details": "Pushing to open more clubs to support Ignatians in building communities where passions are celebrated." }, { "title": "AI Awareness", "statement": "Seminars regarding how AI affects our society.", "details": "Educating ICT and general student bodies on the misuses and consequences of abusing Artificial Intelligence." } ] },
      { "id": 19, "position": "Grade 12 ABM Representative", "full_name": "Athea Chates T. Idian", "motto": "Keep moving forward, no matter how slow.", "credentials": { "academic_excellence": ["Grade 4-5 Conduct & Behavior Awards", "Grade 7-10 Academic Achiever", "Grade 11 With Honors"], "leadership_experience": ["Grade 8 Classroom Secretary, Grade 11 Classroom PIO", "Grade 12 Classroom Vice President"], "notable_achievements": ["Sports Fest HipHop Competition Participant", "2nd runner up in Dance Competition (Grade 9)"] }, "platforms_and_advocacies": [ { "title": "Entrepreneurship and Financial Literacy", "statement": "Bumuo ng isang mas nagkakaisa, aktibo, at matagumpay na komunidad.", "details": "Isusulong ang mga programang magpapalawak ng kaalaman sa negosyo, pananalapi, at leadership para sa paghahanda sa kolehiyo." } ] },
      { "id": 20, "position": "Grade 12 HE Representative", "full_name": "Angel G. Carandang", "motto": "Don’t impress Others, impress Yourself.", "credentials": { "academic_excellence": ["Elementary Grade 1 & 5 Academic Achiever, Special Awards", "JHS Grade 9 Academic Achiever", "SHS Grade 11 With Honors"], "leadership_experience": ["Grade 9 Class Auditor", "Grade 11 & 12 Class Secretary of HE / MYANMAR"], "notable_achievements": ["Sining Pandayan Arts and Crafts Workshop Award - Modeling Clay Mini Cake"] }, "platforms_and_advocacies": [ { "title": "Laboratory Tool and Supply Completion", "statement": "Maging pinuno na may hangarin na harapin ang bawat suliranin.", "details": "Completing laboratory tools, specialized equipment, first aid kits, and sanitation supplies so HE students can voice out needs and work in an organized manner." } ] },
      { "id": 21, "position": "Grade 12 HUMSS Representative", "full_name": "Michael Angelo C. Castro", "motto": "Jack of all trades, master of none is still better than master of one.", "credentials": { "competitions_and_awards": ["Quiz bee gold medalist (G11)", "Acting Competition 1st placer (G9)", "Track & Field 1st runner up (G10)", "Spelling bee champion (G4)", "Math and Science competition 3rd placer (G4)"] }, "platforms_and_advocacies": [ { "title": "Strand Potential Development", "statement": "Lead other HUMSS students to their fullest potentials.", "details": "Making the talents and abilities of HUMSS students visible, leading them towards their academic and personal goals." } ] }
    ];
    renderCandidateSystem(backupData);
  }
}

// Function mapper to accurately dynamic cluster category types
function mapPositionToGroup(pos) {
  const p = pos.toLowerCase();
  if (p.includes('president') || p.includes('secretary') || p.includes('treasurer') || p.includes('auditor') || p.includes('officer') || p.includes('pio')) {
    return "Executive Officers";
  }
  if (p.includes('chairperson')) {
    return "Chairperson Officers";
  }
  if (p.includes('grade 11')) {
    return "Grade 11 Representatives";
  }
  if (p.includes('grade 12')) {
    return "Grade 12 Representatives";
  }
  return "Other Positions";
}

function renderCandidateSystem(data) {
  candidatesGlobalData = data;
  const groupsRoot = document.getElementById('candidate-groups');
  if (!groupsRoot) return;
  groupsRoot.innerHTML = '';

  // Filter out blanks (Vacant slots won't show cards)
  const validCandidates = data.filter(c => c.full_name && !c.full_name.toLowerCase().includes('vacant'));

  // Unique Group Categories Order Map
  const categories = ["Executive Officers", "Chairperson Officers", "Grade 11 Representatives", "Grade 12 Representatives"];

  categories.forEach(cat => {
    const items = validCandidates.filter(c => mapPositionToGroup(c.position) === cat);
    if (items.length === 0) return;

    const section = document.createElement('div');
    section.className = 'group';
    section.innerHTML = `
      <h3 class="group__title">${cat}</h3>
      <p class="group__sub">Tap a card to view credentials, platform &amp; advocacy.</p>
      <div class="grid3">
        ${items.map(c => {
          // Dynamic image binding based on last name mapping logic
          const nameParts = c.full_name.trim().split(' ');
          let lastName = nameParts[nameParts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
          // Handling exceptions like "A. Prudente"
          if(c.full_name.includes('Prudente')) lastName = 'prudente';
          const calculatedImg = `${lastName}.png`;

          return `
            <article class="card" tabindex="0" data-id="${c.id}">
              <div class="card__frame">
                <div class="candidate-photo-wrapper">
                  <img src="${calculatedImg}" alt="${c.full_name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\' fill=\'%2311294D\'><rect width=\'100\' height=\'100\'/><circle cx=\'50\' cy=\'40\' r=\'20\' fill=\'%230096ff\'/><path d=\'M20,90 Q50,60 80,90 Z\' fill=\'%230096ff\'/></svg>'">
                </div>
                <div class="card__wave-overlay"></div>
                <div class="card__name-block">
                  <p class="card__name">${c.full_name}</p>
                  <p class="card__position">${c.position}</p>
                </div>
              </div>
              <div class="card__tap">View Credentials &amp; Platform</div>
            </article>
          `;
        }).join('')}
      </div>
    `;
    groupsRoot.appendChild(section);
  });
}

/* ---------------------------------------------------------
   4. SCROLLABLE OVERLAY MODAL SYSTEM
--------------------------------------------------------- */
const overlay = document.getElementById('detail-overlay');
const detailCanvas = document.getElementById('detail-canvas');
const detailAvatar = document.getElementById('detail-avatar');
const detailName = document.getElementById('detail-name');
const detailPosition = document.getElementById('detail-position');
const detailMotto = document.getElementById('detail-motto');
const detailCredsContent = document.getElementById('detail-credentials-content');
const detailPlatsContent = document.getElementById('detail-platforms-content');
let detailWave = null;

function openCandidate(id) {
  const c = candidatesGlobalData.find(x => x.id === Number(id));
  if (!c || !overlay) return;

  const nameParts = c.full_name.trim().split(' ');
  let lastName = nameParts[nameParts.length - 1].toLowerCase().replace(/[^a-z]/g, '');
  if(c.full_name.includes('Prudente')) lastName = 'prudente';
  const calculatedImg = `${lastName}.png`;

  if (detailAvatar) {
    detailAvatar.innerHTML = `
      <div class="modal-photo-wrapper">
        <img src="${calculatedImg}" alt="${c.full_name}" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 100 100\' fill=\'%2311294D\'><rect width=\'100\' height=\'100\'/><circle cx=\'50\' cy=\'40\' r=\'20\' fill=\'%230096ff\'/><path d=\'M20,90 Q50,60 80,90 Z\' fill=\'%230096ff\'/></svg>'">
      </div>
    `;
  }
  
  if (detailName) detailName.textContent = c.full_name;
  if (detailPosition) detailPosition.textContent = c.position;
  if (detailMotto) detailMotto.textContent = c.motto ? `"${c.motto}"` : "";

  // Render Object-Based Credentials Content Structure
  if (detailCredsContent) {
    detailCredsContent.innerHTML = '';
    const keys = Object.keys(c.credentials || {});
    if (keys.length === 0 || keys.every(k => c.credentials[k].length === 0)) {
      detailCredsContent.innerHTML = '<p class="empty-text">No credentials listed.</p>';
    } else {
      keys.forEach(key => {
        const arr = c.credentials[key];
        if (arr && arr.length > 0) {
          const title = key.replace(/_/g, ' ').toUpperCase();
          const block = document.createElement('div');
          block.className = 'creds-subgroup';
          block.innerHTML = `
            <h5>${title}</h5>
            <ul>${arr.map(item => `<li>${item}</li>`).join('')}</ul>
          `;
          detailCredsContent.appendChild(block);
        }
      });
    }
  }

  // Render Platforms Content Structure
  if (detailPlatsContent) {
    detailPlatsContent.innerHTML = '';
    if (!c.platforms_and_advocacies || c.platforms_and_advocacies.length === 0) {
      detailPlatsContent.innerHTML = '<p class="empty-text">No explicit platform pillars listed.</p>';
    } else {
      c.platforms_and_advocacies.forEach(p => {
        const pBlock = document.createElement('div');
        pBlock.className = 'plat-item';
        pBlock.innerHTML = `
          <h5>${p.title}</h5>
          <p class="plat-statement"><em>"${p.statement}"</em></p>
          <p class="plat-details">${p.details}</p>
        `;
        detailPlatsContent.appendChild(pBlock);
      });
    }
  }

  overlay.classList.remove('hidden');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  if (!detailWave && detailCanvas) {
    detailWave = initEngineCanvas(detailCanvas, {
      enableStars: false,
      layers: [
        { color: 'rgba(2, 130, 214, 0.15)', amp: 20, len: 0.008, speed: 0.0015, yFactor: 0.75 },
        { color: 'rgba(3, 69, 155, 0.12)',  amp: 26, len: 0.006, speed: 0.001, yFactor: 0.88 }
      ]
    });
  }
}

function closeCandidate() {
  if (!overlay) return;
  overlay.classList.add('hidden');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

document.addEventListener('click', (e) => {
  const card = e.target.closest('.card');
  if (card) openCandidate(card.getAttribute('data-id'));
});

document.addEventListener('keydown', (e) => {
  const card = e.target.closest('.card');
  if ((e.key === 'Enter' || e.key === ' ') && card) {
    e.preventDefault();
    openCandidate(card.getAttribute('data-id'));
  }
});

const closeBtn = document.getElementById('detail-close');
if (closeBtn) closeBtn.addEventListener('click', closeCandidate);
if (overlay) overlay.addEventListener('click', (e) => { if (e.target === overlay) closeCandidate(); });

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && overlay && !overlay.classList.contains('hidden')) {
    closeCandidate();
  }
});

// Initialization
loadCandidates();