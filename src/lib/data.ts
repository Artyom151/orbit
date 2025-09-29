// This file is now deprecated as we are using live data from Firestore.
// It is kept for reference but will be removed in a future update.

export type User = {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string;
  coverPhoto: string;
  bio: string;
};

export type Post = {
  id: string;
  userId: string;
  content: string;
  image?: string;
  likes: number;
  comments: number;
  createdAt: string;
};

export type Group = {
  id: string;
  name: string;
  slug: string;
  description: string;
  memberCount: number;
  banner: string;
};

export type Message = {
    id: string;
    senderId: string;
    text: string;
    timestamp: string;
}

export type Conversation = {
    id: string;
    userId: string;
    messages: Message[];
}

export const users: User[] = [
  {
    id: "user-1",
    name: "Alex Johnson",
    username: "alexj",
    email: "alex.j@example.com",
    avatar: 'https://picsum.photos/seed/1/200/200',
    coverPhoto: 'https://picsum.photos/seed/10/800/200',
    bio: "Photographer & Traveler. Capturing moments from around the world.",
  },
  {
    id: "user-2",
    name: "Samantha Bee",
    username: "sambee",
    email: "samantha.b@example.com",
    avatar: 'https://picsum.photos/seed/2/200/200',
    coverPhoto: 'https://picsum.photos/seed/11/800/200',
    bio: "Developer and tech enthusiast. Building the future, one line of code at a time.",
  },
  {
    id: "user-3",
    name: "Casey Lee",
    username: "caseyl",
    email: "casey.l@example.com",
    avatar: 'https://picsum.photos/seed/3/200/200',
    coverPhoto: 'https://picsum.photos/seed/12/800/200',
    bio: "Food blogger and recipe creator. Join me on my culinary adventures!",
  },
    {
    id: "user-4",
    name: "Jordan Smith",
    username: "j_smith",
    email: "jordan.s@example.com",
    avatar: 'https://picsum.photos/seed/4/200/200',
    coverPhoto: 'https://picsum.photos/seed/13/800/200',
    bio: "Fitness coach and marathon runner. Pushing limits and inspiring others.",
  },
];

export const currentUser = users[0];

export const posts: Post[] = [
  {
    id: "post-1",
    userId: "user-2",
    content:
      "Just launched a new project I've been working on for months! It's a tool to help developers organize their workflow. Check it out and let me know what you think. #webdev #coding #saas",
    image: 'https://picsum.photos/seed/20/600/400',
    likes: 128,
    comments: 23,
    createdAt: "2024-05-20T10:00:00Z",
  },
  {
    id: "post-2",
    userId: "user-3",
    content: "Spent the weekend baking this lemon meringue pie. The recipe is now up on my blog! It's the perfect summer dessert. 🍋☀️",
    image: 'https://picsum.photos/seed/21/600/400',
    likes: 350,
    comments: 45,
    createdAt: "2024-05-20T14:30:00Z",
  },
  {
    id: "post-3",
    userId: "user-1",
    content: "Sunrise over the mountains in Patagonia. This was one of the most breathtaking views I've ever seen. Can't wait to share more from this trip.",
    image: 'https://picsum.photos/seed/22/600/400',
    likes: 540,
    comments: 72,
    createdAt: "2024-05-19T22:15:00Z",
  },
  {
    id: "post-4",
    userId: "user-4",
    content: "Finished my morning 10k run. The weather was perfect! Feeling energized and ready to tackle the day. What's your morning routine? #running #fitness",
    likes: 95,
    comments: 15,
    createdAt: "2024-05-21T08:00:00Z"
  }
];

export const groups: Group[] = [
    {
        id: "group-1",
        name: "Hiking Enthusiasts",
        slug: "hiking-enthusiasts",
        description: "A community for people who love hiking, trekking, and the great outdoors.",
        memberCount: 1200,
        banner: 'https://picsum.photos/seed/30/800/200'
    },
    {
        id: "group-2",
        name: "Book Worms Club",
        slug: "book-worms-club",
        description: "Share and discuss your favorite books, from classic literature to modern thrillers.",
        memberCount: 3400,
        banner: 'https://picsum.photos/seed/31/800/200'
    },
    {
        id: "group-3",
        name: "Digital Nomads",
        slug: "digital-nomads",
        description: "Connect with fellow remote workers and travelers to share tips and stories.",
        memberCount: 560,
        banner: 'https://picsum.photos/seed/32/800/200'
    }
];

export const conversations: Conversation[] = [
    {
        id: "conv-1",
        userId: "user-2",
        messages: [
            { id: "msg-1", senderId: "user-2", text: "Hey! Did you see the new framework update?", timestamp: "2024-05-21T09:00:00Z" },
            { id: "msg-2", senderId: "user-1", text: "Oh yeah, I saw that. Looks promising. Have you tried it yet?", timestamp: "2024-05-21T09:01:00Z" },
            { id: "msg-3", senderId: "user-2", text: "Not yet, planning to this weekend. The new features for state management look amazing.", timestamp: "2024-05-21T09:02:00Z" },
        ]
    },
    {
        id: "conv-2",
        userId: "user-3",
        messages: [
            { id: "msg-4", senderId: "user-3", text: "Your pie photo was incredible! You have to give me the recipe.", timestamp: "2024-05-20T15:00:00Z" },
            { id: "msg-5", senderId: "user-1", text: "Thanks so much! I just posted it on my blog. Let me know if you try it!", timestamp: "2024-05-20T15:05:00Z" },
        ]
    }
]

// These functions are now deprecated.
export function getPostsWithUsers() {
    return [];
}

export function getConversationsWithUsers() {
     return [];
}
