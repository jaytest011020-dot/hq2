// gencreds_part1.js  (Part 1 of 3)
// Paste Part 1, then Part 2, then Part 3 to form gencreds.js

const { format } = require("util");

module.exports.config = {
  name: "gencreds",
  version: "1.2.0",
  hasPermssion: 0,
  credits: "ChatGPT + You",
  description: "Generate realistic-looking username/password pairs (no attachment). Username = name(>=6 letters) + number(s).",
  usages: "/gencreds <count=5> [basename]",
  commandCategory: "tools",
  cooldowns: 5
};

// ----- NAME LIST (you can replace with the big FIRSTS array) -----
const FIRSTS = [
  "Aaliyah","Aaron","Abby","Abigail","Adrian","Aiden","Aisha","Alana","Albert","Alec",
  "Alex","Alexa","Alexander","Alexis","Alice","Alicia","Allan","Allison","Ally","Alvin",
  "Amanda","Amber","Amelia","Amir","Amy","Andre","Andrew","Andy","Angel","Angela",
  "Anna","Anthony","Antonio","Ariana","Arielle","Arjun","Arthur","Asher","Ashlyn","Aubrey",
  "Austin","Ava","Avery","Axel","Barbara","Beatrice","Ben","Benjamin","Bianca","Blake",
  "Brandon","Brenda","Brian","Brianna","Brooke","Brooklyn","Bruce","Bryan","Caden","Caitlyn",
  "Caleb","Calvin","Cameron","Camila","Camille","Cara","Carlos","Carla","Carmen","Carol",
  "Caroline","Carter","Casey","Cecilia","Chad","Chase","Charles","Charlie","Charlotte","Chloe",
  "Chris","Christian","Christina","Christopher","Cindy","Claire","Clara","Claudia","Clay","Cody",
  "Colin","Conor","Connor","Cora","Corey","Cristina","Crystal","Curtis","Daisy","Dakota",
  "Dalia","Damon","Daniel","Daniella","Danielle","Daphne","Darren","David","Dawson","Dean",
  "Deanna","Declan","Delilah","Demi","Derek","Diana","Diego","Dominic","Dominique","Donna",
  "Dorian","Drew","Duncan","Eddie","Eden","Eleanor","Elena","Eliana","Elias","Elijah",
  "Elisa","Elise","Elizabeth","Ella","Elliot","Elliott","Ellis","Elle","Ellen","Ellie",
  "Emerson","Emerson","Emilia","Emily","Emma","Emmanuel","Eric","Erica","Erin","Estela",
  "Ethan","Eva","Evan","Evelyn","Fabian","Faith","Felicity","Felix","Fernando","Fiona",
  "Francis","Francisco","Frank","Gabe","Gabriel","Gabriela","Gabrielle","Gage","Gavin","Gemma",
  "George","Georgia","Gianna","Gina","Giselle","Gloria","Grace","Gracie","Grant","Greg",
  "Gregory","Hannah","Harper","Harrison","Harry","Hayden","Hazel","Heather","Heidi","Helen",
  "Henry","Holly","Hope","Hudson","Hugo","Ian","Ibrahim","Iggy","Ike","Imani",
  "Inez","Ira","Irene","Iris","Isaac","Isabel","Isabella","Isaiah","Ivan","Ivy",
  "Jack","Jackie","Jackson","Jacob","Jade","Jadon","Jake","Jakob","James","Jamie",
  "Jasmine","Jason","Jasper","Javier","Jay","Jayden","Jean","Jenna","Jennifer","Jenny",
  "Jeremiah","Jeremy","Jesse","Jessica","Jesus","Jillian","Jim","Joan","Jocelyn","Jody",
  "Joel","Joelle","John","Johnny","Jon","Jonathan","Jordan","Jorge","Joseph","Josephine",
  "Josh","Joshua","Josiah","Joy","Joyce","Juan","Jude","Judith","Julia","Julian",
  "Julie","June","Justin","Kaden","Kai","Kaila","Kaitlyn","Kara","Karen","Karina",
  "Karl","Katelyn","Kate","Katherine","Kathleen","Kathryn","Katie","Kayla","Keanu","Kendall",
  "Kenny","Kevin","Kiara","Kiera","Kim","Kimberly","Kingston","Kira","Kirsten","Kobe",
  "Krista","Kristen","Kristian","Kristin","Kurt","Kyle","Kyra","Laila","Lana","Larry",
  "Laura","Lauren","Laurie","Layla","Leah","Lee","Leila","Lena","Leo","Leon",
  "Leonard","Leona","Leslie","Liam","Lilah","Lillian","Lilly","Lily","Lincoln","Linda",
  "Lindsay","Lindsey","Lisa","Liz","Logan","Lola","Loren","Lorena","Lori","Lorenzo",
  "Louis","Lucas","Lucy","Luis","Luna","Luke","Lydia","Lyla","Lyra","Mack",
  "Mackenzie","Madeline","Madelyn","Madison","Maggie","Manuel","Marc","Marcel","Marcos","Marcus",
  "Margaret","Maria","Mariana","Marina","Mario","Marissa","Mark","Marlon","Marta","Martin",
  "Marvin","Mary","Mason","Mateo","Mathew","Matthew","Matt","Maurice","Max","Maxwell",
  "Maya","Mckenzie","Megan","Melanie","Melissa","Melody","Micah","Michael","Michaela","Micheal",
  "Michelle","Miguel","Mila","Milan","Mildred","Miles","Miriam","Misha","Mitch","Mitchell",
  "Molly","Monica","Morgan","Moses","Mya","Myra","Naomi","Natalia","Natalie","Nathan",
  "Nathaniel","Naya","Neil","Nell","Nico","Nicholas","Nicole","Nina","Noah","Nora",
  "Norman","Oliver","Olivia","Omar","Opal","Owen","Pablo","Parker","Pat","Patrick",
  "Paul","Paula","Pavel","Pearl","Pedro","Penelope","Penny","Peter","Phil","Philip",
  "Phoenix","Piper","Quentin","Quinn","Rafael","Rae","Raegan","Ralph","Ramon","Randy",
  "Raphael","Ray","Raymond","Rebecca","Reec","Reed","Reese","Regina","Reina","Rene",
  "Rhiannon","Riley","Rita","River","Rob","Robbie","Robert","Roberto","Robin","Rocco",
  "Roderick","Rogelio","Ronan","Rosa","Rosalie","Rose","Ross","Rowan","Roy","Ruby",
  "Rudy","Russell","Ruth","Ryan","Ryder","Sabrina","Sage","Sakura","Sally","Sam",
  "Samantha","Samuel","Sanchez","Sandra","Santiago","Sara","Sarah","Sasha","Sawyer","Scarlett",
  "Scott","Sean","Sebastian","Selena","Sergio","Serena","Seth","Shane","Shania","Shawn",
  "Shay","Shelby","Sherry","Sidney","Silas","Simone","Sky","Skylar","Sofia","Solomon",
  "Sophia","Sophie","Spencer","Stan","Stanley","Stefan","Stella","Stephen","Steve","Steven",
  "Stuart","Summer","Susan","Suzanne","Sydney","Sylvia","Talia","Tamara","Tanner","Tanya",
  "Tara","Tatiana","Taylor","Ted","Teresa","Terrance","Terrence","Terry","Thea","Theo",
  "Theresa","Thomas","Tiffany","Tim","Timothy","Tobias","Todd","Tom","Tomas","Tony",
  "Tracy","Travis","Trent","Trevor","Tristan","Trudy","Troy","Tyler","Tyrone","Ulysses",
  "Umar","Valentina","Valeria","Valerie","Vanessa","Vera","Veronica","Vernon","Victor","Victoria",
  "Vince","Vincent","Viola","Violet","Virgil","Vivian","Wade","Walter","Wanda","Warren",
  "Wayne","Wesley","Whitney","Wilbur","Will","William","Willow","Wilson","Wyatt","Xander",
  "Xavier","Xena","Yahir","Yasmine","Yasmin","Yelena","Ying","Yvonne","Zach","Zack",
  "Zackary","Zadie","Zaira","Zane","Zara","Zayden","Zephyr","Zia","Ziggy","Zion",
  "Zoey","Zola","Zora","Zuri","Aarav","Abel","Abram","Adelaide","Adeline","Adele",
  "Agnes","Alessia","Alina","Alyssa","Amaya","Amira","Anastasia","Angelo","Anika","Ansel",
  "Antonia","Ari","Aria","Armani","Astrid","Atticus","August","Aurora","Ayaan","Azalea",
  "Balthazar","Beau","Belinda","Bennett","Beryl","Bishop","Blythe","Bo","Bonnie","Boyd",
  "Bria","Bridget","Briar","Briggs","Britt","Brody","Brooke","Bryce","Caden","Caelan",
  "Cai","Cairo","Callie","Camden","Carmen","Cassidy","Cassian","Cecil","Celeste","Cesar",
  "Chance","Chandler","Charity","Charleigh","Charmaine","Cheryl","Cheyenne","Cian","Cillian","Clarence",
  "Clarissa","Cleo","Clement","Cleo","Cody","Colby","Cole","Colleen","Constance","Coralie",
  "Cordelia","Cory","Cove","Creed","Cruz","Curt","Cyra","Dahlia","Dane","Daphne",
  "Darcy","Dario","Darius","Darren","Daryl","Dawson","Dax","Dayton","Deacon","Deanna",
  "Delia","Demetrius","Desiree","Devin","Dexter","Diamond","Dina","Dion","Dixie","Dolly",
  "Dominik","Domenic","Don","Donna","Dorian","Dottie","Drake","Drew","Dua","Duke",
  "Duncan","Eamon","Earl","Easter","Edison","Eduardo","Eileen","Elaine","Eleanora","Elia",
  "Elian","Elijah","Elin","Eliseo","Eloise","Elsa","Elton","Ember","Emery","Emile",
  "Emory","Enzo","Eowyn","Ephraim","Erin","Errol","Etta","Eunice","Evan","Evie",
  "Ezekiel","Ezra","Fabio","Fabrizio","Faye","Ferran","Fiona","Flora","Florence","Ford",
  "Forest","Foster","Frances","Franco","Frankie","Freya","Galen","Gannon","Gareth","Garrett",
  "Gavin","Giana","Gideon","Gillian","Giselle","Glenn","Graham","Grady","Greta","Gunner",
  "Gus","Hadley","Haley","Hamish","Harlan","Harley","Harmony","Harper","Harold","Harris",
  "Hart","Haven","Hayes","Hector","Hendrix","Hera","Hero","Hester","Holden","Honora",
  "Hoyt","Hugo","Huxley","Ida","Idris","Iker","Iliana","Imogen","Indigo","Ione",
  "Ira","Irene","Irina","Isa","Isla","Itzel","Ivy","Jada","Jagger","Jai",
  "Jamal","Janelle","Janet","Jared","Jarvis","Jaxon","Jayce","Jemma","Jensen","Jett",
  "Jilian","Joanne","Jolene","Jonah","Joni","Jory","Josette","Journey","Joy","Judah",
  "Julio","Juniper","Justine","Kade","Kadence","Kaia","Kairo","Kaleigh","Kaleb","Kamila",
  "Kane","Kara","Kari","Karmen","Kaya","Keira","Kellan","Kelsey","Kendrick","Kenna",
  "Kensley","Kenzie","Khalid","Kian","Kiera","Killian","Kimber","Kingsley","Kira","Koa",
  "Kody","Kora","Kourtney","Kristo","Kyler","Lacey","Lana","Lark","Laszlo","Leander",
  "Leila","Lennon","Leo","Leopold","Levi","Lexi","Libby","Lian","Lidia","Liesel",
  "Linus","Lionel","Lisette","Livia","Lois","Lorcan","Louisa","Luca","Lucian","Lucille",
  "Luna","Lyndon","Mabel","Mac","Mack","Madalyn","Maddox","Magnus","Maia","Majestic",
  "Major","Malia","Marek","Marin","Marlie","Marlowe","Marlo","Mars","Marta","Matilda",
  "Maura","Mavis","Maxine","May","Mckinley","Merrick","Mika","Mikaela","Milan","Milo",
  "Mira","Miranda","Miriam","Monroe","Monty","Morgana","Moses","Murphy","Nadia","Nala",
  "Napoleon","Nash","Naya","Neve","Nia","Nicolette","Niko","Nina","Noelle","Noemi",
  "Nola","Norma","Nova","Nyla","Oakley","Ocean","Odette","Odin","Odelia","Ole",
  "Olive","Omega","Onyx","Ophelia","Orla","Orion","Orlaith","Otis","Pablo","Paige",
  "Paloma","Parker","Pasha","Patrice","Paxton","Perla","Perry","Petra","Phoenix","Pierce",
  "Piper","Porter","Presley","Quiana","Quincy","Quinn","Rae","Raina","Ramona","Ranc",
  "Raven","Rayna","Rebel","Reina","Remy","Renee","Rhett","Ricky","Rian","Ridge",
  "Riley","Rina","Ripley","River","Roan","Rocco","Roderick","Roe","Rohan","Rory",
  "Ruben","Rudy","Rue","Rufus","Rumi","Runa","Rune","Ryan","Sable","Sacha",
  "Sage","Saira","Salem","Salma","Samara","Samuelle","Sandro","Santiago","Sansa","Santino",
  "Sarai","Sasha","Saturn","Savanna","Sawyer","Scarlet","Selah","Selene","Seth","Siena",
  "Silas","Signe","Sienna","Sigurd","Simeon","Sincere","Siri","Skye","Sol","Solange",
  "Sonny","Sorrel","Stellan","Stevie","Stoke","Stone","Story","Storm","Suki","Sulley",
  "Sutton","Sylas","Sylvie","Talia","Talon","Tamsin","Tanner","Tariq","Tate","Teagan",
  "Temperance","Terra","Thalia","Theo","Theodora","Thiago","Thor","Tiana","Tobias","Torin",
  "Tova","Trinity","Tristan","Trudy","Tucker","Tulio","Turner","Ty","Tyla","Tylor",
  "Ulani","Urbain","Uriah","Valen","Valerie","Veda","Velma","Vera","Verity","Vesper",
  "Vinnie","Vita","Vivienne","Vladimir","Waverly","Wendell","Wes","West","Weston","Whit",
  "Wilhelmina","Wilfred","Willa","Windy","Winslow","Winston","Wren","Xanthe","Xavia","Xiomara",
  "Xochitl","Yara","Yasmine","Yelena","Ynez","Yoko","Yolanda","Yori","Yoshi","Yul",
  "Yuri","Yvaine","Zada","Zahra","Zain","Zaina","Zaki","Zander","Zara","Zayla",
  "Zeena","Zelda","Zella","Zen","Zena","Zeno","Zephyr","Zia","Zina","Ziva"
];
// gencreds_part2.js  (Part 2 of 3)
// Continue from Part 1

function twoDigit(n){ return (n < 10 ? "0" + n : "" + n); }
function dateStamp(d = new Date()){
  const dd = twoDigit(d.getDate());
  const mm = twoDigit(d.getMonth() + 1);
  const yy = ("" + d.getFullYear()).slice(-2);
  return `${dd}${mm}${yy}`;
}
function pick(arr){ return arr[Math.floor(Math.random() * arr.length)]; }

// Keep only letters, ensure at least minLen (pad by repeating part of a chosen filler)
function normalizeBaseName(input, minLen = 6){
  let s = (input || "").replace(/[^A-Za-z]/g, "");
  if (!s) s = pick(FIRSTS);
  while (s.length < minLen) {
    const filler = pick(FIRSTS).replace(/[^A-Za-z]/g, "");
    s += filler.slice(0, Math.min(filler.length, minLen - s.length));
  }
  return s;
}

function randomNumberSuffix(minDigits = 1, maxDigits = 4){
  const digits = Math.floor(Math.random() * (maxDigits - minDigits + 1)) + minDigits;
  const max = 10 ** digits - 1;
  const min = 10 ** (digits - 1);
  return String(Math.floor(Math.random() * (max - min + 1)) + min);
}

function stylizeWord(word){
  let out = "";
  for (let i = 0; i < word.length; i++){
    out += (i % 2 === 0) ? word[i].toUpperCase() : word[i].toLowerCase();
  }
  if (word.length > 2 && Math.random() < 0.25) {
    out = out.slice(0,1) + out.charAt(1).toUpperCase() + out.slice(2);
  }
  return out;
    }
// gencreds_part3.js  (Part 3 of 3)
// Paste after Part 2 to complete file

module.exports.run = async function({ api, event, args }) {
  const { threadID, messageID } = event;
  const count = Math.max(1, Math.min(50, parseInt(args[0]) || 5)); // max 50 to avoid spam
  const baseArg = args[1] ? args.slice(1).join(" ") : null;
  const todayStamp = dateStamp(new Date());
  const ADJECTIVES = ["Zeus","Nova","Aero","Shadow","Echo","Blaze","Valk","Zen","Orion","Axiom","Vero","Lumos"];

  const results = [];
  for (let i = 0; i < count; i++){
    let base = baseArg ? normalizeBaseName(baseArg, 6) : normalizeBaseName(pick(FIRSTS), 6);
    if (Math.random() < 0.4) base = base.charAt(0).toUpperCase() + base.slice(1).toLowerCase();
    const suffix = randomNumberSuffix(1, 4);
    const username = `${base}${suffix}`;
    const adj = pick(ADJECTIVES);
    const password = `${stylizeWord(adj)}${todayStamp}`;
    results.push({ username, password });
  }

  // Build message (show up to 20 entries)
  const previewCount = Math.min(20, results.length);
  let body = `🔐 Generated ${results.length} credential(s):\n\n`;
  for (let i = 0; i < previewCount; i++){
    body += format("Username: %s\nPassword: %s\n\n", results[i].username, results[i].password);
  }
  if (results.length > previewCount) body += `…and ${results.length - previewCount} more generated.\n`;
  body += `\n📌 Note: These credentials are for educational/testing purposes only.`;

  return api.sendMessage(body, threadID, messageID);
};
