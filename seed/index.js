// seed/index.js — Multi-Store Library Management System
// 22 Indian stores · 77 books · Upsert-safe (re-runnable)
require('dotenv').config({ path: '.env.local' });
if (!process.env.MONGODB_URI) require('dotenv').config({ path: '.env' });

const mongoose = require('mongoose');
const bcrypt   = require('bcryptjs');
const User     = require('../models/User');
const Store    = require('../models/Store');
const Book     = require('../models/Book');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) { console.error('❌ MONGODB_URI not set'); process.exit(1); }
console.log('📋 MongoDB:', MONGODB_URI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@'));

async function hashPwd(p) {
  return bcrypt.hash(p, await bcrypt.genSalt(10));
}

// ─── Cover image helper ───────────────────────────────────────────────────────
const cover = (isbn) => `https://covers.openlibrary.org/b/isbn/${isbn}-M.jpg`;

// ─── 22 Stores (hardcoded GeoJSON — no geocoding delay) ──────────────────────
const STORES = [
  // ── PUNE (8 stores — tight cluster for nearby feature) ──────────────────────
  {
    key: 's1',
    owner: { name: 'Ananya Kulkarni', username: 'ananya_k',    email: 'store1@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'Pune Central Library',   address: '1 Shivajinagar, Sambhaji Park',        city: 'Pune',      timings: '9:00 AM - 8:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [73.8478, 18.5308] } },
  },
  {
    key: 's2',
    owner: { name: 'Rohan Desai',     username: 'rohan_desai',  email: 'store2@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'FC Road Literary Hub',   address: '42 Fergusson College Road',           city: 'Pune',      timings: '10:00 AM - 9:00 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [73.8553, 18.5195] } },
  },
  {
    key: 's3',
    owner: { name: 'Priya Joshi',     username: 'priya_joshi',  email: 'store3@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'Koregaon Park Reads',    address: '7 N Main Road, Koregaon Park',        city: 'Pune',      timings: '10:00 AM - 8:00 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [73.8938, 18.5362] } },
  },
  {
    key: 's4',
    owner: { name: 'Vikram Patil',    username: 'vikram_patil', email: 'store4@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'Deccan Book Palace',      address: '88 Deccan Gymkhana',                  city: 'Pune',      timings: '9:30 AM - 7:30 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [73.8416, 18.5162] } },
  },
  {
    key: 's5',
    owner: { name: 'Sneha Thakur',    username: 'sneha_thakur', email: 'store5@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'Kothrud Knowledge Hub',  address: '15 Karve Road, Kothrud',              city: 'Pune',      timings: '9:00 AM - 7:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [73.8077, 18.5074] } },
  },
  {
    key: 's6',
    owner: { name: 'Arjun Sharma',    username: 'arjun_sharma', email: 'store6@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'Viman Nagar Library',    address: '23 Viman Nagar Main Road',            city: 'Pune',      timings: '10:00 AM - 8:30 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [73.9143, 18.5679] } },
  },
  {
    key: 's7',
    owner: { name: 'Deepika Bapat',   username: 'deepika_bapat',email: 'store7@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'Aundh Book Corner',      address: '56 ITI Road, Aundh',                  city: 'Pune',      timings: '9:00 AM - 6:30 PM',  isOpenToday: false, location: { type: 'Point', coordinates: [73.8082, 18.5590] } },
  },
  {
    key: 's8',
    owner: { name: 'Rahul Mahajan',   username: 'rahul_mahajan',email: 'store8@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'Hadapsar Book World',    address: '101 Solapur Road, Hadapsar',          city: 'Pune',      timings: '8:00 AM - 7:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [73.9260, 18.5018] } },
  },
  // ── MUMBAI (5 stores) ──────────────────────────────────────────────────────
  {
    key: 's9',
    owner: { name: 'Meera Nair',      username: 'meera_nair',   email: 'store9@library.com',  password: 'store123', role: 'STORE' },
    store: { storeName: 'Bandra Book Corner',     address: '14A Linking Road, Bandra West',       city: 'Mumbai',    timings: '10:00 AM - 9:00 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [72.8295, 19.0596] } },
  },
  {
    key: 's10',
    owner: { name: 'Suresh Menon',    username: 'suresh_menon', email: 'store10@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Dadar Library',          address: '5 Gokhale Road, Dadar West',          city: 'Mumbai',    timings: '9:00 AM - 8:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [72.8419, 19.0183] } },
  },
  {
    key: 's11',
    owner: { name: 'Kavita Rao',      username: 'kavita_rao',   email: 'store11@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Andheri Reads',          address: '88 Versova Road, Andheri West',       city: 'Mumbai',    timings: '11:00 AM - 9:00 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [72.8265, 19.1196] } },
  },
  {
    key: 's12',
    owner: { name: 'Nikhil Shah',     username: 'nikhil_shah',  email: 'store12@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Fort Heritage Library',  address: '22 MG Road, Fort',                    city: 'Mumbai',    timings: '9:00 AM - 6:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [72.8364, 18.9322] } },
  },
  {
    key: 's13',
    owner: { name: 'Shalini Iyer',    username: 'shalini_iyer', email: 'store13@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Juhu Beach Books',       address: '3 Juhu Tara Road, Juhu',              city: 'Mumbai',    timings: '10:00 AM - 9:30 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [72.8263, 19.1075] } },
  },
  // ── BANGALORE (4 stores) ──────────────────────────────────────────────────
  {
    key: 's14',
    owner: { name: 'Krishna Murthy',  username: 'krishna_gv',   email: 'store14@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Koramangala Bookstore',  address: '80 Feet Road, 6th Block Koramangala', city: 'Bangalore', timings: '9:00 AM - 8:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [77.6245, 12.9352] } },
  },
  {
    key: 's15',
    owner: { name: 'Lakshmi Venkat',  username: 'lakshmi_v',    email: 'store15@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Indiranagar Reads',      address: '12th Main Road, Indiranagar',         city: 'Bangalore', timings: '10:00 AM - 8:30 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [77.6408, 12.9784] } },
  },
  {
    key: 's16',
    owner: { name: 'Karthik Reddy',   username: 'karthik_r',    email: 'store16@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'MG Road Books',          address: '45 MG Road, Brigade Road',            city: 'Bangalore', timings: '10:00 AM - 9:00 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [77.6099, 12.9758] } },
  },
  {
    key: 's17',
    owner: { name: 'Divya Krishnan',  username: 'divya_k',      email: 'store17@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Jayanagar Library',      address: '4th Block, Jayanagar',                city: 'Bangalore', timings: '9:00 AM - 7:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [77.5937, 12.9279] } },
  },
  // ── DELHI (2 stores) ──────────────────────────────────────────────────────
  {
    key: 's18',
    owner: { name: 'Amit Gupta',      username: 'amit_gupta',   email: 'store18@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Connaught Place Library',address: 'Block A, Connaught Place',            city: 'Delhi',     timings: '9:00 AM - 8:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [77.2167, 28.6315] } },
  },
  {
    key: 's19',
    owner: { name: 'Pooja Agarwal',   username: 'pooja_a',      email: 'store19@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Karol Bagh Book Hub',    address: '34 Arya Samaj Road, Karol Bagh',      city: 'Delhi',     timings: '10:00 AM - 8:00 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [77.1907, 28.6514] } },
  },
  // ── HYDERABAD (2 stores) ──────────────────────────────────────────────────
  {
    key: 's20',
    owner: { name: 'Srinivas Rao',    username: 'srinivas_r',   email: 'store20@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'Banjara Hills Library',  address: 'Road No. 12, Banjara Hills',          city: 'Hyderabad', timings: '9:00 AM - 8:30 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [78.4347, 17.4156] } },
  },
  {
    key: 's21',
    owner: { name: 'Asha Reddy',      username: 'asha_reddy',   email: 'store21@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'HITEC City Reads',       address: 'Cyber Towers, HITEC City',            city: 'Hyderabad', timings: '10:00 AM - 9:00 PM', isOpenToday: true,  location: { type: 'Point', coordinates: [78.3772, 17.4435] } },
  },
  // ── CHENNAI (1 store) ─────────────────────────────────────────────────────
  {
    key: 's22',
    owner: { name: 'Murugan Pillai',  username: 'murugan_p',    email: 'store22@library.com', password: 'store123', role: 'STORE' },
    store: { storeName: 'T Nagar Book World',     address: 'Usman Road, T. Nagar',                city: 'Chennai',   timings: '9:00 AM - 8:00 PM',  isOpenToday: true,  location: { type: 'Point', coordinates: [80.2341, 13.0418] } },
  },
];

// ─── 77 Books (unique ISBNs, categorised, mapped to store keys) ──────────────
// Distribution: s1=5, s2=4, s3=4, s4=3, s5=3, s6=3, s7=3, s8=3,
//               s9=5, s10=4, s11=3, s12=3, s13=3,
//               s14=4, s15=4, s16=3, s17=3,
//               s18=4, s19=3, s20=4, s21=3, s22=3  → Total 77
const BOOKS = [
  // ── Store s1: Pune Central Library (5) ─────────────────────────────────────
  { storeKey:'s1', title:'The Alchemist',              author:'Paulo Coelho',          category:'Fiction',     ISBN:'9780062315007', totalCopies:5, availableCopies:5, description:'A philosophical novel about a young shepherd following his dreams.' },
  { storeKey:'s1', title:'Clean Code',                 author:'Robert C. Martin',      category:'Programming', ISBN:'9780132350884', totalCopies:3, availableCopies:3, description:'A handbook of agile software craftsmanship and best practices.' },
  { storeKey:'s1', title:'A Brief History of Time',    author:'Stephen Hawking',       category:'Science',     ISBN:'9780553380163', totalCopies:4, availableCopies:4, description:'Explores cosmology, black holes, and the nature of time.' },
  { storeKey:'s1', title:'Sapiens',                    author:'Yuval Noah Harari',     category:'History',     ISBN:'9780062316097', totalCopies:6, availableCopies:6, description:'A brief history of humankind from the Stone Age to the present.' },
  { storeKey:'s1', title:'The Pragmatic Programmer',   author:'David Thomas',          category:'Technology',  ISBN:'9780135957059', totalCopies:3, availableCopies:3, description:'Your journey to mastery in software development.' },

  // ── Store s2: FC Road Literary Hub (4) ─────────────────────────────────────
  { storeKey:'s2', title:"Harry Potter and the Philosopher's Stone", author:'J.K. Rowling', category:'Fiction', ISBN:'9780439708180', totalCopies:8, availableCopies:8, description:'The magical beginning of Harry Potter\'s journey at Hogwarts.' },
  { storeKey:'s2', title:'Pride and Prejudice',        author:'Jane Austen',           category:'Romance',     ISBN:'9780141439518', totalCopies:4, availableCopies:4, description:'A witty romantic novel set in Regency-era England.' },
  { storeKey:'s2', title:'Naruto Vol. 1',              author:'Masashi Kishimoto',     category:'Manga',       ISBN:'9781591166023', totalCopies:5, availableCopies:5, description:'The story of Naruto Uzumaki, a young ninja seeking recognition.' },
  { storeKey:'s2', title:'It',                         author:'Stephen King',          category:'Horror',      ISBN:'9781501156700', totalCopies:3, availableCopies:3, description:'A terrifying tale of Pennywise the Dancing Clown in Derry, Maine.' },

  // ── Store s3: Koregaon Park Reads (4) ──────────────────────────────────────
  { storeKey:'s3', title:'Rich Dad Poor Dad',          author:'Robert Kiyosaki',       category:'Finance',     ISBN:'9781612680194', totalCopies:6, availableCopies:6, description:'What the rich teach their kids about money that the poor do not.' },
  { storeKey:'s3', title:'The Lean Startup',           author:'Eric Ries',             category:'Technology',  ISBN:'9780307887894', totalCopies:4, availableCopies:4, description:'How entrepreneurs use continuous innovation to build businesses.' },
  { storeKey:'s3', title:'On the Origin of Species',   author:'Charles Darwin',        category:'Science',     ISBN:'9780140432053', totalCopies:3, availableCopies:3, description:'Darwin\'s groundbreaking theory of evolution by natural selection.' },
  { storeKey:'s3', title:'To Kill a Mockingbird',      author:'Harper Lee',            category:'Fiction',     ISBN:'9780061935466', totalCopies:5, availableCopies:5, description:'A powerful story of racial injustice and moral growth in the American South.' },

  // ── Store s4: Deccan Book Palace (3) ───────────────────────────────────────
  { storeKey:'s4', title:'India After Gandhi',          author:'Ramachandra Guha',      category:'History',     ISBN:'9780330396110', totalCopies:4, availableCopies:4, description:'The comprehensive history of the world\'s largest democracy.' },
  { storeKey:'s4', title:'The Great Gatsby',            author:'F. Scott Fitzgerald',   category:'Fiction',     ISBN:'9780743273565', totalCopies:5, availableCopies:5, description:'A classic tale of the American Dream and the Roaring Twenties.' },
  { storeKey:'s4', title:'The Notebook',                author:'Nicholas Sparks',       category:'Romance',     ISBN:'9781455582877', totalCopies:4, availableCopies:4, description:'A timeless love story spanning decades.' },

  // ── Store s5: Kothrud Knowledge Hub (3) ────────────────────────────────────
  { storeKey:'s5', title:'Introduction to Algorithms', author:'Thomas H. Cormen',      category:'Programming', ISBN:'9780262033848', totalCopies:3, availableCopies:3, description:'The comprehensive textbook on algorithms used worldwide.' },
  { storeKey:'s5', title:'Artificial Intelligence: A Modern Approach', author:'Stuart Russell', category:'Technology', ISBN:'9780134610993', totalCopies:2, availableCopies:2, description:'The leading textbook on AI used in universities globally.' },
  { storeKey:'s5', title:'Cosmos',                     author:'Carl Sagan',            category:'Science',     ISBN:'9780345539434', totalCopies:4, availableCopies:4, description:'A personal voyage through the universe by the legendary astronomer.' },

  // ── Store s6: Viman Nagar Library (3) ──────────────────────────────────────
  { storeKey:'s6', title:'One Piece Vol. 1',           author:'Eiichiro Oda',          category:'Manga',       ISBN:'9781569316238', totalCopies:5, availableCopies:5, description:'Monkey D. Luffy sets sail to find the legendary One Piece treasure.' },
  { storeKey:'s6', title:'The Shining',                author:'Stephen King',          category:'Horror',      ISBN:'9780307743657', totalCopies:3, availableCopies:2, description:'A chilling psychological horror set in the haunted Overlook Hotel.' },
  { storeKey:'s6', title:'1984',                       author:'George Orwell',         category:'Fiction',     ISBN:'9780451524935', totalCopies:6, availableCopies:6, description:'A dystopian vision of a totalitarian surveillance society.' },

  // ── Store s7: Aundh Book Corner (3) ────────────────────────────────────────
  { storeKey:'s7', title:'The Intelligent Investor',   author:'Benjamin Graham',       category:'Finance',     ISBN:'9780062312686', totalCopies:4, availableCopies:4, description:'The definitive book on value investing, recommended by Warren Buffett.' },
  { storeKey:'s7', title:'Guns, Germs, and Steel',     author:'Jared Diamond',         category:'History',     ISBN:'9780393354324', totalCopies:3, availableCopies:3, description:'Why did some civilizations conquer others? A sweeping history.' },
  { storeKey:'s7', title:'Me Before You',              author:'Jojo Moyes',            category:'Romance',     ISBN:'9780143124542', totalCopies:5, availableCopies:5, description:'A heart-wrenching love story that will change you.' },

  // ── Store s8: Hadapsar Book World (3) ──────────────────────────────────────
  { storeKey:'s8', title:'Brave New World',            author:'Aldous Huxley',         category:'Fiction',     ISBN:'9780060850524', totalCopies:4, availableCopies:4, description:'A dystopian novel about a future society controlled by technology.' },
  { storeKey:'s8', title:'The Grand Design',           author:'Stephen Hawking',       category:'Science',     ISBN:'9780553805375', totalCopies:3, availableCopies:3, description:'New answers to the ultimate questions of life and the universe.' },
  { storeKey:'s8', title:'The Phoenix Project',        author:'Gene Kim',              category:'Technology',  ISBN:'9781942788294', totalCopies:3, availableCopies:3, description:'A novel about IT, DevOps, and helping your business win.' },

  // ── Store s9: Bandra Book Corner (5) ───────────────────────────────────────
  { storeKey:'s9', title:'The Kite Runner',            author:'Khaled Hosseini',       category:'Fiction',     ISBN:'9781594480003', totalCopies:5, availableCopies:5, description:'A moving story of friendship, guilt, and redemption in Afghanistan.' },
  { storeKey:'s9', title:'Outlander',                  author:'Diana Gabaldon',        category:'Romance',     ISBN:'9780440212560', totalCopies:4, availableCopies:4, description:'A time-travel romance between 18th-century Scotland and modern times.' },
  { storeKey:'s9', title:'The Discovery of India',     author:'Jawaharlal Nehru',      category:'History',     ISBN:'9780195623598', totalCopies:3, availableCopies:3, description:'Nehru\'s sweeping account of India\'s civilization and history.' },
  { storeKey:'s9', title:'The Selfish Gene',           author:'Richard Dawkins',       category:'Science',     ISBN:'9780198788607', totalCopies:4, availableCopies:4, description:'A gene-centred view of evolution that revolutionised biology.' },
  { storeKey:'s9', title:'Think and Grow Rich',        author:'Napoleon Hill',         category:'Finance',     ISBN:'9781585424331', totalCopies:5, availableCopies:5, description:'The classic guide to personal achievement and financial success.' },

  // ── Store s10: Dadar Library (4) ───────────────────────────────────────────
  { storeKey:'s10', title:'Deep Learning',             author:'Ian Goodfellow',        category:'Technology',  ISBN:'9780262035613', totalCopies:2, availableCopies:2, description:'The definitive textbook on deep learning and neural networks.' },
  { storeKey:'s10', title:'Design Patterns',           author:'Gang of Four',          category:'Programming', ISBN:'9780201633610', totalCopies:3, availableCopies:3, description:'Elements of reusable object-oriented software.' },
  { storeKey:'s10', title:'The Feynman Lectures on Physics Vol.1', author:'Richard Feynman', category:'Science', ISBN:'9780465023820', totalCopies:2, availableCopies:2, description:'One of the most celebrated physics lecture series ever published.' },
  { storeKey:'s10', title:'The Catcher in the Rye',   author:'J.D. Salinger',         category:'Fiction',     ISBN:'9780316769174', totalCopies:4, availableCopies:4, description:'A rebellious teen\'s journey through New York City over two days.' },

  // ── Store s11: Andheri Reads (3) ───────────────────────────────────────────
  { storeKey:'s11', title:'Dragon Ball Vol. 1',        author:'Akira Toriyama',        category:'Manga',       ISBN:'9781569319239', totalCopies:5, availableCopies:5, description:'The adventures of the young Son Goku as he searches for Dragon Balls.' },
  { storeKey:'s11', title:'Dracula',                   author:'Bram Stoker',           category:'Horror',      ISBN:'9780141439846', totalCopies:3, availableCopies:3, description:'The iconic gothic horror novel that defined vampire mythology.' },
  { storeKey:'s11', title:"The Hitchhiker's Guide to the Galaxy", author:'Douglas Adams', category:'Fiction',  ISBN:'9780345391803', totalCopies:4, availableCopies:4, description:'The answer to life, the universe, and everything is 42.' },

  // ── Store s12: Fort Heritage Library (3) ───────────────────────────────────
  { storeKey:'s12', title:'Freedom at Midnight',       author:'Larry Collins',         category:'History',     ISBN:'9780671201890', totalCopies:4, availableCopies:4, description:'A gripping account of India\'s independence and Partition in 1947.' },
  { storeKey:'s12', title:'The Psychology of Money',   author:'Morgan Housel',         category:'Finance',     ISBN:'9780857197689', totalCopies:6, availableCopies:6, description:'Timeless lessons on wealth, greed, and happiness.' },
  { storeKey:'s12', title:'Jane Eyre',                 author:'Charlotte Brontë',      category:'Romance',     ISBN:'9780141441146', totalCopies:3, availableCopies:3, description:'A passionate romance between Jane Eyre and the brooding Mr. Rochester.' },

  // ── Store s13: Juhu Beach Books (3) ────────────────────────────────────────
  { storeKey:'s13', title:'The Martian',               author:'Andy Weir',             category:'Fiction',     ISBN:'9780804139021', totalCopies:5, availableCopies:5, description:'An astronaut stranded on Mars must use science to survive.' },
  { storeKey:'s13', title:'Astrophysics for People in a Hurry', author:'Neil deGrasse Tyson', category:'Science', ISBN:'9780393609394', totalCopies:4, availableCopies:4, description:'A quick tour of the universe\'s biggest ideas.' },
  { storeKey:'s13', title:'The DevOps Handbook',       author:'Gene Kim',              category:'Technology',  ISBN:'9781942788003', totalCopies:3, availableCopies:3, description:'How to create world-class agility, reliability, and security in tech.' },

  // ── Store s14: Koramangala Bookstore (4) ───────────────────────────────────
  { storeKey:'s14', title:"You Don't Know JS",         author:'Kyle Simpson',          category:'Programming', ISBN:'9781491924464', totalCopies:4, availableCopies:4, description:'A deep dive into the JavaScript language and its core mechanisms.' },
  { storeKey:'s14', title:"The Innovator's Dilemma",  author:'Clayton Christensen',   category:'Technology',  ISBN:'9780062060235', totalCopies:3, availableCopies:3, description:'Why great companies fail when confronted with disruptive technologies.' },
  { storeKey:'s14', title:'Quantum Mechanics: The Theoretical Minimum', author:'Leonard Susskind', category:'Science', ISBN:'9780465062904', totalCopies:2, availableCopies:2, description:'A rigorous introduction to quantum mechanics for deep learners.' },
  { storeKey:'s14', title:'Security Analysis',         author:'Benjamin Graham',       category:'Finance',     ISBN:'9780071592536', totalCopies:3, availableCopies:3, description:'The classic work on finding undervalued securities in the market.' },

  // ── Store s15: Indiranagar Reads (4) ───────────────────────────────────────
  { storeKey:'s15', title:'Death Note Vol. 1',         author:'Tsugumi Ohba',          category:'Manga',       ISBN:'9781421501680', totalCopies:5, availableCopies:5, description:'A high school student discovers a supernatural notebook used to kill.' },
  { storeKey:'s15', title:'Rebecca',                   author:'Daphne du Maurier',     category:'Romance',     ISBN:'9781844080380', totalCopies:3, availableCopies:3, description:'A gothic romance filled with mystery and obsession at Manderley.' },
  { storeKey:'s15', title:'Midnight in Chernobyl',     author:'Adam Higginbotham',     category:'History',     ISBN:'9781501134616', totalCopies:4, availableCopies:4, description:'The untold story of the world\'s greatest nuclear disaster.' },
  { storeKey:'s15', title:'The Name of the Wind',      author:'Patrick Rothfuss',      category:'Fiction',     ISBN:'9780756404079', totalCopies:5, availableCopies:5, description:'The first day of the legendary wizard Kvothe\'s autobiography.' },

  // ── Store s16: MG Road Books (3) ───────────────────────────────────────────
  { storeKey:'s16', title:'Gone Girl',                 author:'Gillian Flynn',         category:'Horror',      ISBN:'9780307588371', totalCopies:4, availableCopies:4, description:'A chilling psychological thriller about a marriage gone wrong.' },
  { storeKey:'s16', title:'Lord of the Flies',         author:'William Golding',       category:'Fiction',     ISBN:'9780571056866', totalCopies:4, availableCopies:4, description:'Boys stranded on an island descend into savagery.' },
  { storeKey:'s16', title:'The Three-Body Problem',    author:'Liu Cixin',             category:'Science',     ISBN:'9780765382030', totalCopies:3, availableCopies:3, description:'China\'s most beloved sci-fi novel about first contact with an alien world.' },

  // ── Store s17: Jayanagar Library (3) ───────────────────────────────────────
  { storeKey:'s17', title:'Zero to One',               author:'Peter Thiel',           category:'Finance',     ISBN:'9780804139556', totalCopies:5, availableCopies:5, description:'Notes on startups and how to build the future.' },
  { storeKey:'s17', title:'Homo Deus',                 author:'Yuval Noah Harari',     category:'History',     ISBN:'9780062464316', totalCopies:4, availableCopies:4, description:'A brief history of tomorrow and what the future holds for humanity.' },
  { storeKey:'s17', title:'Clean Architecture',        author:'Robert C. Martin',      category:'Technology',  ISBN:'9780134494166', totalCopies:3, availableCopies:3, description:'A craftsman\'s guide to software structure and design.' },

  // ── Store s18: Connaught Place Library (4) ─────────────────────────────────
  { storeKey:'s18', title:'My Experiments with Truth', author:'Mahatma Gandhi',        category:'History',     ISBN:'9780807059098', totalCopies:5, availableCopies:5, description:'Gandhi\'s autobiography covering his spiritual and political journey.' },
  { storeKey:'s18', title:"Surely You're Joking, Mr. Feynman!", author:"Richard Feynman", category:'Science', ISBN:'9780393316049', totalCopies:4, availableCopies:4, description:'Adventures of a curious character — Nobel Prize-winning physicist.' },
  { storeKey:'s18', title:'The Remains of the Day',   author:'Kazuo Ishiguro',        category:'Fiction',     ISBN:'9780679731726', totalCopies:3, availableCopies:3, description:'A butler reflects on devotion, duty, and regret in post-war England.' },
  { storeKey:'s18', title:'Factfulness',               author:'Hans Rosling',          category:'Finance',     ISBN:'9781250107817', totalCopies:4, availableCopies:4, description:'Ten reasons we\'re wrong about the world — and why things are better.' },

  // ── Store s19: Karol Bagh Book Hub (3) ─────────────────────────────────────
  { storeKey:'s19', title:'Sense and Sensibility',     author:'Jane Austen',           category:'Romance',     ISBN:'9780141439662', totalCopies:4, availableCopies:4, description:'Two sisters seek love and romance in Georgian-era England.' },
  { storeKey:'s19', title:'Kubernetes in Action',      author:'Marko Luksa',           category:'Technology',  ISBN:'9781617293726', totalCopies:2, availableCopies:2, description:'A deep dive into deploying and managing applications on Kubernetes.' },
  { storeKey:'s19', title:'Python Crash Course',       author:'Eric Matthes',          category:'Programming', ISBN:'9781593276034', totalCopies:4, availableCopies:4, description:'A hands-on, project-based introduction to Python programming.' },

  // ── Store s20: Banjara Hills Library (4) ───────────────────────────────────
  { storeKey:'s20', title:'The Art of War',            author:'Sun Tzu',               category:'History',     ISBN:'9781599869773', totalCopies:5, availableCopies:5, description:'Ancient Chinese military treatise on strategy and tactics.' },
  { storeKey:'s20', title:'The Dark Tower: The Gunslinger', author:'Stephen King',    category:'Horror',      ISBN:'9781501143519', totalCopies:3, availableCopies:3, description:'The start of Stephen King\'s epic dark fantasy series.' },
  { storeKey:'s20', title:'Foundation',                author:'Isaac Asimov',          category:'Science',     ISBN:'9780553293357', totalCopies:4, availableCopies:4, description:'A galactic empire falls and a scholar races to preserve knowledge.' },
  { storeKey:'s20', title:'The $100 Startup',          author:'Chris Guillebeau',      category:'Finance',     ISBN:'9780307951526', totalCopies:4, availableCopies:4, description:'Reinvent the way you make a living, do what you love, and create a new future.' },

  // ── Store s21: HITEC City Reads (3) ────────────────────────────────────────
  { storeKey:'s21', title:'Fullstack React',           author:'Anthony Accomazzo',     category:'Programming', ISBN:'9781939729507', totalCopies:3, availableCopies:3, description:'The complete guide to ReactJS and friends.' },
  { storeKey:'s21', title:'Attack on Titan Vol. 1',   author:'Hajime Isayama',        category:'Manga',       ISBN:'9781612620244', totalCopies:5, availableCopies:5, description:'Humanity fights for survival against giant man-eating Titans.' },
  { storeKey:'s21', title:'Bird Box',                  author:'Josh Malerman',         category:'Horror',      ISBN:'9780062259653', totalCopies:3, availableCopies:3, description:'After mysterious creatures cause mass hysteria, survivors must navigate blindfolded.' },

  // ── Store s22: T Nagar Book World (3) ──────────────────────────────────────
  { storeKey:'s22', title:'A Tale of Two Cities',      author:'Charles Dickens',       category:'Fiction',     ISBN:'9780141439600', totalCopies:4, availableCopies:4, description:'A historical novel set during the turmoil of the French Revolution.' },
  { storeKey:'s22', title:'Wings of Fire',             author:'A.P.J. Abdul Kalam',    category:'History',     ISBN:'9788173711466', totalCopies:6, availableCopies:6, description:'The inspiring autobiography of India\'s Missile Man and former President.' },
  { storeKey:'s22', title:'The Fault in Our Stars',   author:'John Green',            category:'Romance',     ISBN:'9780525478812', totalCopies:5, availableCopies:5, description:'Two teens with cancer fall in love and discover what truly matters.' },
];

// ─── Seed function ─────────────────────────────────────────────────────────────
async function seed() {
  try {
    console.log('\n🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
    console.log('✅ Connected to:', mongoose.connection.db.databaseName);

    // ── 1. Admin user ──────────────────────────────────────────────────────────
    await User.findOneAndUpdate(
      { email: 'admin@library.com' },
      { name: 'Admin User', username: 'admin', email: 'admin@library.com',
        password: await hashPwd('admin123'), role: 'ADMIN', isBlocked: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('✅ Admin user ready');

    // ── 2. Test user ───────────────────────────────────────────────────────────
    await User.findOneAndUpdate(
      { email: 'user@library.com' },
      { name: 'Test User', username: 'testuser', email: 'user@library.com',
        password: await hashPwd('user123'), role: 'USER', isBlocked: false },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log('✅ Test user ready');

    // ── 3. Remove old NY/LA stores (clean slate) ───────────────────────────────
    const oldOwnerEmails = ['store1@library.com', 'store2@library.com'];
    // Only remove if they belong to old seed (different username pattern)
    // We'll skip aggressive deletion since new emails match — upsert handles it.

    // ── 4. Store owners + stores + books ──────────────────────────────────────
    const storeIdMap = {}; // key → MongoDB _id

    for (const entry of STORES) {
      const { key, owner, store: storeData } = entry;

      // Upsert store owner (User with role STORE)
      const ownerDoc = await User.findOneAndUpdate(
        { email: owner.email },
        { name: owner.name, username: owner.username, email: owner.email,
          password: await hashPwd(owner.password), role: 'STORE', isBlocked: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      // Upsert store (one store per owner)
      const storeDoc = await Store.findOneAndUpdate(
        { ownerId: ownerDoc._id },
        { ...storeData, ownerId: ownerDoc._id },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      storeIdMap[key] = storeDoc._id;
      console.log(`  🏪 [${key}] ${storeData.storeName} — ${storeData.city}`);
    }

    console.log(`\n✅ ${STORES.length} stores ready\n`);

    // ── 5. Books ───────────────────────────────────────────────────────────────
    let bookCount = 0;
    for (const book of BOOKS) {
      const storeId = storeIdMap[book.storeKey];
      if (!storeId) {
        console.warn(`  ⚠ Unknown storeKey: ${book.storeKey} for book "${book.title}"`);
        continue;
      }
      const bookImage = cover(book.ISBN);
      const { storeKey, ...bookData } = book;

      await Book.findOneAndUpdate(
        { ISBN: bookData.ISBN },
        { ...bookData, storeId, bookImage },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      bookCount++;
    }

    console.log(`✅ ${bookCount} books seeded\n`);
    console.log('════════════════════════════════════════════');
    console.log('Login Credentials');
    console.log('════════════════════════════════════════════');
    console.log('  Admin   → admin@library.com  / admin123');
    console.log('  User    → user@library.com   / user123');
    console.log('  Stores  → store1@library.com … store22@library.com / store123');
    console.log('════════════════════════════════════════════\n');

    // ── 6. Ensure 2dsphere index is created ───────────────────────────────────
    await Store.collection.createIndex({ location: '2dsphere' });
    console.log('✅ 2dsphere index ensured on Store.location');

    await mongoose.connection.close();
    process.exit(0);
  } catch (err) {
    console.error('\n❌ Seeding error:', err);
    await mongoose.connection.close();
    process.exit(1);
  }
}

seed();
