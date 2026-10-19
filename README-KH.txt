RULE KMER SUVIVAL — ប្រព័ន្ធគណនី Web (Firebase Phone OTP)
===========================================================

ឯកសារនេះអាច Upload ទៅ GitHub Pages បាន ប៉ុន្តែត្រូវកំណត់ Firebase មុន ទើប OTP SMS ពិតដំណើរការ។

ជំហានលើ Android:
1. ចូល https://console.firebase.google.com/ ហើយបង្កើត Project។
2. បន្ថែម Web App (</>) និងចម្លង Firebase config។
3. Authentication > Sign-in method > Phone > Enable។
4. Authentication > Settings > Authorized domains: បន្ថែម domain GitHub Pages របស់អ្នក
   (ឧ. USERNAME.github.io — ប្រើ domain ពិតរបស់អ្នក)។
5. Build > Firestore Database > Create database។
6. បើក public/index.html ដោយ GitHub web editor ហើយជំនួសតម្លៃ firebaseConfig ខាងក្រោម
   ដោយ config ពិតរបស់ Web App។
7. Upload ឯកសារទាំងអស់ក្នុង ZIP ទៅ repository របស់ GitHub។
8. Repository > Settings > Pages > Deploy from a branch > main / root > Save។

សុវត្ថិភាព:
- Firebase web config មិនមែនជាពាក្យសម្ងាត់ទេ ប៉ុន្តែត្រូវកំណត់ Security Rules ឱ្យត្រឹមត្រូវ។
- កុំបើក Firestore ដោយ test mode ជាអចិន្ត្រៃយ៍។
- កុំដាក់ service-account key ឬ private secret ក្នុង GitHub Pages។
- SMS OTP អាចមានថ្លៃសេវា និងកំណត់តាមប្រទេស/គម្រោង Firebase។
- ត្រូវសាកល្បង domain និង Phone sign-in មុនចែករំលែកហ្គេម។

Firestore Rules ឧទាហរណ៍ (Firebase Console > Firestore > Rules):
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /players/{uid} {
      allow read: if request.auth != null && request.auth.uid == uid;
      allow create, update: if request.auth != null
        && request.auth.uid == uid
        && request.resource.data.keys().hasOnly(['uid','phoneNumber','playerName','createdAt','updatedAt'])
        && request.resource.data.uid == request.auth.uid
        && request.resource.data.phoneNumber == request.auth.token.phone_number;
      allow delete: if false;
    }
  }
}

Rules នេះកំណត់ឱ្យអ្នកលេងអាចអាន/កែតែឯកសាររបស់ខ្លួន។ កុំប្រើ Admin SDK ឬ secret key នៅក្នុង browser។
