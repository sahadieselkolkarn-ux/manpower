# **App Name**: ManpowerFlow

## Core Features:

- User Authentication: Implement email/password authentication using Firebase Auth.
- Role-Based Access Control: Define user roles: admin, operationManager, hrManager, financeManager, offineAdmin, operationAdmin, hrAdmin, ececutive, user1, user2. Store roles in the 'users' collection in Firestore.
- Firestore Security Rules: Implement Firestore Security Rules to grant 'admin' role full access to all collections for development purposes.
- User Data Management: Store user data and roles in the 'users' collection in Firestore.
- Permission Check Function: Create a function to check user permissions for rendering menu items based on their role.

## Style Guidelines:

- Primary color: A muted blue (#6699CC) to convey trust and professionalism.
- Background color: A very light gray (#F0F0F0) for a clean and modern look.
- Accent color: A warm orange (#FFB347) to highlight key actions and interactive elements.
- Font pairing: 'Inter' (sans-serif) for body text and 'Space Grotesk' (sans-serif) for headlines.
- Use consistent and professional icons to represent different functions and modules.
- Maintain a clean and organized layout with clear sections for different roles and tasks.
- Incorporate subtle transitions and animations to enhance user experience.