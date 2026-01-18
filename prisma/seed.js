const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Clear existing data (in development only!)
  if (process.env.NODE_ENV === 'development') {
    console.log('🗑️  Clearing existing data...');
    await prisma.activity.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.message.deleteMany();
    await prisma.conversationParticipant.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.mentorSession.deleteMany();
    await prisma.mentorFollow.deleteMany();
    await prisma.eventInterest.deleteMany();
    await prisma.eventSchedule.deleteMany();
    await prisma.event.deleteMany();
    await prisma.comment.deleteMany();
    await prisma.like.deleteMany();
    await prisma.post.deleteMany();
    await prisma.announcement.deleteMany();
    await prisma.communityFollow.deleteMany();
    await prisma.communityAdmin.deleteMany();
    await prisma.community.deleteMany();
    await prisma.mentor.deleteMany();
    await prisma.fellow.deleteMany();
    await prisma.admin.deleteMany();
    await prisma.user.deleteMany();
  }

  // Hash password
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 1. Create Super Admin
  console.log('👤 Creating Super Admin...');
  const superAdmin = await prisma.user.create({
    data: {
      name: 'Super Admin',
      email: 'admin@hmcc.com',
      password: hashedPassword,
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      admin: {
        create: {
          permissions: JSON.stringify(['all']),
          department: 'Administration',
        },
      },
    },
  });

  // 2. Create Content Admin
  const contentAdmin = await prisma.user.create({
    data: {
      name: 'Content Manager',
      email: 'content@hmcc.com',
      password: hashedPassword,
      role: 'CONTENT_ADMIN',
      status: 'ACTIVE',
      admin: {
        create: {
          permissions: JSON.stringify(['announcements', 'events', 'pages']),
          department: 'Content',
        },
      },
    },
  });

  // 3. Create Mentors
  console.log('👨‍🏫 Creating Mentors...');
  const mentor1 = await prisma.user.create({
    data: {
      name: 'Ahmet Yılmaz',
      email: 'ahmet@mentor.com',
      password: hashedPassword,
      role: 'MENTOR',
      status: 'ACTIVE',
      avatar: 'https://i.pravatar.cc/150?img=1',
      mentor: {
        create: {
          title: 'Senior Software Engineer',
          company: 'Google',
          expertise: JSON.stringify(['JavaScript', 'React', 'Node.js', 'System Design']),
          bio: 'Experienced software engineer with 10+ years in the industry. Passionate about mentoring and helping students grow.',
          availability: 'available',
          rating: 4.8,
          sessionsCompleted: 127,
          responseTime: '2h',
        },
      },
    },
  });

  const mentor2 = await prisma.user.create({
    data: {
      name: 'Zeynep Demir',
      email: 'zeynep@mentor.com',
      password: hashedPassword,
      role: 'MENTOR',
      status: 'ACTIVE',
      avatar: 'https://i.pravatar.cc/150?img=2',
      mentor: {
        create: {
          title: 'Product Designer',
          company: 'Microsoft',
          expertise: JSON.stringify(['UI/UX Design', 'Figma', 'Design Systems']),
          bio: 'Product designer helping students build better user experiences.',
          availability: 'available',
          rating: 4.9,
          sessionsCompleted: 85,
          responseTime: '4h',
        },
      },
    },
  });

  // 4. Create Communities
  console.log('🏘️  Creating Communities...');
  const techCommunity = await prisma.community.create({
    data: {
      name: 'Technology Club',
      slug: 'technology-club',
      description: 'A community for tech enthusiasts to learn and share knowledge.',
      category: 'Technology',
      tags: JSON.stringify(['Programming', 'AI', 'Web Development']),
      status: 'ACTIVE',
      isVerified: true,
      avatar: 'https://via.placeholder.com/150/0066CC/FFFFFF?text=TECH',
    },
  });

  const designCommunity = await prisma.community.create({
    data: {
      name: 'Design Studio',
      slug: 'design-studio',
      description: 'Creative minds coming together to design amazing experiences.',
      category: 'Art',
      tags: JSON.stringify(['UI/UX', 'Graphic Design', 'Illustration']),
      status: 'ACTIVE',
      isVerified: true,
      avatar: 'https://via.placeholder.com/150/FF6B6B/FFFFFF?text=DESIGN',
    },
  });

  // 5. Create Community Admin
  console.log('👥 Creating Community Admins...');
  const communityAdminUser = await prisma.user.create({
    data: {
      name: 'Mehmet Kaya',
      email: 'mehmet@community.com',
      password: hashedPassword,
      role: 'COMMUNITY_ADMIN',
      status: 'ACTIVE',
      avatar: 'https://i.pravatar.cc/150?img=3',
    },
  });

  await prisma.communityAdmin.create({
    data: {
      userId: communityAdminUser.id,
      communityId: techCommunity.id,
      role: 'admin',
    },
  });

  // 6. Create Fellows (Students)
  console.log('🎓 Creating Fellows...');
  const fellows = [];
  for (let i = 0; i < 10; i++) {
    const fellow = await prisma.user.create({
      data: {
        name: `Student ${i + 1}`,
        email: `student${i + 1}@hacettepe.edu.tr`,
        password: hashedPassword,
        role: 'FELLOW',
        status: 'ACTIVE',
        avatar: `https://i.pravatar.cc/150?img=${i + 10}`,
        fellow: {
          create: {
            team: i % 3 === 0 ? 'Yazılım Takımı' : i % 3 === 1 ? 'Tasarım Takımı' : 'Pazarlama Takımı',
            department: 'Computer Engineering',
            year: (i % 4) + 1,
            bio: `Hello! I'm a ${(i % 4) + 1}th year student interested in technology.`,
            interests: JSON.stringify(['Coding', 'Design', 'Entrepreneurship']),
            eventsAttended: Math.floor(Math.random() * 20),
          },
        },
      },
    });
    fellows.push(fellow);
  }

  // 7. Create Events
  console.log('📅 Creating Events...');
  const event1 = await prisma.event.create({
    data: {
      title: 'Intro to Web Development Workshop',
      description: 'Learn the basics of web development with HTML, CSS, and JavaScript.',
      communityId: techCommunity.id,
      date: new Date('2026-02-15'),
      time: '14:00',
      location: 'Beytepe Campus, Room 301',
      image: 'https://via.placeholder.com/600x400/4A90E2/FFFFFF?text=Web+Dev+Workshop',
      capacity: 50,
      category: 'topluluk',
      status: 'UPCOMING',
      schedule: {
        create: [
          { time: '14:00', activity: 'Opening & Introduction' },
          { time: '14:30', activity: 'HTML Basics' },
          { time: '15:30', activity: 'CSS Styling' },
          { time: '16:30', activity: 'JavaScript Fundamentals' },
          { time: '17:30', activity: 'Q&A Session' },
        ],
      },
    },
  });

  const event2 = await prisma.event.create({
    data: {
      title: 'UI/UX Design Bootcamp',
      description: 'A comprehensive bootcamp on modern UI/UX design principles.',
      communityId: designCommunity.id,
      date: new Date('2026-02-20'),
      time: '10:00',
      location: 'Online - Zoom',
      image: 'https://via.placeholder.com/600x400/FF6B6B/FFFFFF?text=Design+Bootcamp',
      capacity: 30,
      category: 'topluluk',
      status: 'UPCOMING',
    },
  });

  // 8. Create Posts
  console.log('📝 Creating Posts...');
  const post1 = await prisma.post.create({
    data: {
      authorId: fellows[0].id,
      communityId: techCommunity.id,
      type: 'TEXT',
      content: 'Just finished my first React project! So excited to share it with you all. 🚀',
      isPublished: true,
    },
  });

  const post2 = await prisma.post.create({
    data: {
      authorId: fellows[1].id,
      communityId: designCommunity.id,
      type: 'IMAGE',
      content: 'Check out my latest UI design for a mobile banking app!',
      mediaUrl: 'https://via.placeholder.com/800x600/9B59B6/FFFFFF?text=UI+Design',
      mediaType: 'image',
      isPublished: true,
    },
  });

  // 9. Create Likes
  console.log('❤️  Creating Likes...');
  await prisma.like.create({
    data: {
      userId: fellows[2].id,
      postId: post1.id,
    },
  });

  await prisma.like.create({
    data: {
      userId: fellows[3].id,
      postId: post1.id,
    },
  });

  // 10. Create Comments
  console.log('💬 Creating Comments...');
  await prisma.comment.create({
    data: {
      userId: fellows[4].id,
      postId: post1.id,
      content: 'Awesome work! Can you share the GitHub repo?',
    },
  });

  // 11. Create Community Follows
  console.log('👣 Creating Community Follows...');
  for (let i = 0; i < 5; i++) {
    await prisma.communityFollow.create({
      data: {
        userId: fellows[i].id,
        communityId: techCommunity.id,
      },
    });
  }

  // 12. Create Event Interests
  console.log('⭐ Creating Event Interests...');
  for (let i = 0; i < 8; i++) {
    await prisma.eventInterest.create({
      data: {
        userId: fellows[i].id,
        eventId: event1.id,
      },
    });
  }

  // 13. Create Mentor Follows
  console.log('🔔 Creating Mentor Follows...');
  const mentor1Profile = await prisma.mentor.findUnique({
    where: { userId: mentor1.id },
  });

  await prisma.mentorFollow.create({
    data: {
      userId: fellows[0].id,
      mentorId: mentor1Profile.id,
    },
  });

  // 14. Create Announcements
  console.log('📢 Creating Announcements...');
  await prisma.announcement.create({
    data: {
      title: 'New Semester Registration Open',
      content: 'Registration for the new semester activities is now open. Join us for exciting events and workshops!',
      summary: 'Registration is open for new semester activities.',
      type: 'topluluk',
      category: 'General',
      status: 'PUBLISHED',
      authorId: contentAdmin.id,
      communityId: techCommunity.id,
      publishedAt: new Date(),
      viewCount: 234,
    },
  });

  // 15. Create Conversations and Messages
  console.log('💌 Creating Conversations...');
  const conversation = await prisma.conversation.create({
    data: {
      lastMessage: 'Hey! Are you coming to the workshop?',
      lastMessageAt: new Date(),
      participants: {
        create: [
          { userId: fellows[0].id, unreadCount: 0 },
          { userId: fellows[1].id, unreadCount: 1 },
        ],
      },
      messages: {
        create: [
          {
            senderId: fellows[0].id,
            content: 'Hey! Are you coming to the workshop?',
            isRead: false,
          },
        ],
      },
    },
  });

  console.log('✅ Database seeded successfully!');
  console.log('\n📊 Summary:');
  console.log(`  - Super Admin: admin@hmcc.com / password123`);
  console.log(`  - Content Admin: content@hmcc.com / password123`);
  console.log(`  - Mentor 1: ahmet@mentor.com / password123`);
  console.log(`  - Mentor 2: zeynep@mentor.com / password123`);
  console.log(`  - Community Admin: mehmet@community.com / password123`);
  console.log(`  - Fellows: student1@hacettepe.edu.tr - student10@hacettepe.edu.tr / password123`);
  console.log(`  - ${fellows.length} Students created`);
  console.log(`  - 2 Communities created`);
  console.log(`  - 2 Events created`);
  console.log(`  - 2 Posts created`);
  console.log(`  - 1 Announcement created`);
}

main()
  .catch((e) => {
    console.error('❌ Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
