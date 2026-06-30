// Seeds the database with demo data: an admin user, an organizer, a handful
// of events with generated seat maps, so the app is immediately usable after
// `npm run prisma:migrate && npm run prisma:seed`.

const { PrismaClient } = require('../generated/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const SECTIONS = [
  { name: 'VIP', rows: 2, seatsPerRow: 8, priceTier: 2.5 },
  { name: 'PREMIUM', rows: 4, seatsPerRow: 10, priceTier: 1.5 },
  { name: 'GENERAL', rows: 6, seatsPerRow: 12, priceTier: 1.0 },
];

function buildSeatsForEvent(eventId) {
  const seats = [];
  for (const section of SECTIONS) {
    for (let r = 0; r < section.rows; r++) {
      const rowLetter = String.fromCharCode(65 + r); // A, B, C...
      for (let s = 1; s <= section.seatsPerRow; s++) {
        seats.push({
          eventId,
          seatCode: `${section.name[0]}${rowLetter}${s}`,
          section: section.name,
          priceTier: section.priceTier,
          status: 'AVAILABLE',
        });
      }
    }
  }
  return seats;
}

async function main() {
  console.log('Seeding database...');

  // --- Users -----------------------------------------------------------
  const adminPasswordHash = await bcrypt.hash('Admin@12345', 10);
  const organizerPasswordHash = await bcrypt.hash('Organizer@12345', 10);
  const customerPasswordHash = await bcrypt.hash('Customer@12345', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@ticketops.dev' },
    update: {},
    create: {
      email: 'admin@ticketops.dev',
      passwordHash: adminPasswordHash,
      fullName: 'Platform Admin',
      role: 'ADMIN',
    },
  });

  const organizer = await prisma.user.upsert({
    where: { email: 'organizer@ticketops.dev' },
    update: {},
    create: {
      email: 'organizer@ticketops.dev',
      passwordHash: organizerPasswordHash,
      fullName: 'Event Organizer',
      role: 'ORGANIZER',
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@ticketops.dev' },
    update: {},
    create: {
      email: 'customer@ticketops.dev',
      passwordHash: customerPasswordHash,
      fullName: 'Demo Customer',
      role: 'CUSTOMER',
    },
  });

  console.log(`Users ready: admin=${admin.email}, organizer=${organizer.email}`);

  // --- Events + Seats ----------------------------------------------------
  const eventDefs = [
    {
      title: 'Arijit Singh Live in Concert',
      description: 'An unforgettable evening of soulful music under the stars.',
      category: 'Music',
      venue: 'DY Patil Stadium',
      city: 'Mumbai',
      basePrice: 1500,
      daysFromNow: 14,
    },
    {
      title: 'Stand-Up Comedy Night',
      description: 'A night of laughter with India\'s top comedians.',
      category: 'Comedy',
      venue: 'Phoenix MarketCity Hall',
      city: 'Pune',
      basePrice: 600,
      daysFromNow: 7,
    },
    {
      title: 'Tech Conclave 2026',
      description: 'Talks on AI, cloud, and platform engineering from industry leaders.',
      category: 'Conference',
      venue: 'Pune International Convention Center',
      city: 'Pune',
      basePrice: 2000,
      daysFromNow: 30,
    },
    {
      title: 'Premier League Watch Party',
      description: 'Big screen, big crowd, big match.',
      category: 'Sports',
      venue: 'The Sports Bar Arena',
      city: 'Bengaluru',
      basePrice: 400,
      daysFromNow: 3,
    },
  ];

  for (const def of eventDefs) {
    const startsAt = new Date(Date.now() + def.daysFromNow * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 3 * 60 * 60 * 1000);

    const existing = await prisma.event.findFirst({ where: { title: def.title } });
    if (existing) {
      console.log(`Skipping existing event: ${def.title}`);
      continue;
    }

    const event = await prisma.event.create({
      data: {
        title: def.title,
        description: def.description,
        category: def.category,
        venue: def.venue,
        city: def.city,
        startsAt,
        endsAt,
        basePrice: def.basePrice,
        totalSeats: 0, // updated below
        isPublished: true,
        organizerId: organizer.id,
      },
    });

    const seats = buildSeatsForEvent(event.id);
    await prisma.seat.createMany({ data: seats });
    await prisma.event.update({
      where: { id: event.id },
      data: { totalSeats: seats.length },
    });

    console.log(`Created event "${event.title}" with ${seats.length} seats`);
  }

  console.log('Seeding complete.');
  console.log('');
  console.log('Demo accounts:');
  console.log('  admin@ticketops.dev      / Admin@12345     (ADMIN)');
  console.log('  organizer@ticketops.dev  / Organizer@12345 (ORGANIZER)');
  console.log('  customer@ticketops.dev   / Customer@12345  (CUSTOMER)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
