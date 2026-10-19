import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import {
  getAuth, RecaptchaVerifier, signInWithPhoneNumber, onAuthStateChanged, signOut
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import {
  getFirestore, doc, getDoc, setDoc, serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

// TODO: ជំនួសតម្លៃខាងក្រោមដោយ Firebase Web App config ពិតរបស់អ្នក។
const firebaseConfig = {
  apiKey: "PASTE_YOUR_API_KEY",
  authDomain: "PASTE_YOUR_PROJECT.firebaseapp.com",
  projectId: "PASTE_YOUR_PROJECT_ID",
  appId: "PASTE_YOUR_APP_ID"
};

const $ = (id) => document.getElementById(id);
const statusBox = $("status");
let auth, db, confirmation = null, recaptcha = null;
let mode = "register";

function status(message, kind = "") {
  statusBox.textContent = message;
  statusBox.className = "status" + (kind ? " " + kind : "");
}
function configReady() {
  return firebaseConfig.apiKey !== "PASTE_YOUR_API_KEY"
    && firebaseConfig.projectId !== "PASTE_YOUR_PROJECT_ID"
    && firebaseConfig.appId !== "PASTE_YOUR_APP_ID";
}
function setMode(next) {
  mode = next;
  $("tab-register").classList.toggle("active", mode === "register");
  $("tab-login").classList.toggle("active", mode === "login");
  $("playerName").hidden = mode === "login";
  $("playerName").previousElementSibling.hidden = mode === "login";
  status(mode === "register" ? "បញ្ចូលឈ្មោះ និងលេខទូរស័ព្ទ រួចផ្ញើ OTP។" : "បញ្ចូលលេខទូរស័ព្ទដែលបានចុះឈ្មោះ រួចផ្ញើ OTP។");
}
$("tab-register").addEventListener("click", () => setMode("register"));
$("tab-login").addEventListener("click", () => setMode("login"));

if (!configReady()) {
  status("ត្រូវបញ្ចូល Firebase Web App config ក្នុង public/app.js មុន ទើបអាចផ្ញើ OTP បាន។");
} else {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  auth.languageCode = "km";

  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      $("profile").hidden = true;
      $("send-code").hidden = false;
      return;
    }
    $("send-code").hidden = true;
    $("otp-area").hidden = true;
    $("profile").hidden = false;
    $("profile-phone").textContent = "លេខទូរស័ព្ទ: " + (user.phoneNumber || "");
    $("profile-id").textContent = user.uid;
    try {
      const ref = doc(db, "players", user.uid);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        $("profile-name").textContent = "ឈ្មោះអ្នកលេង: " + snap.data().playerName;
      } else {
        $("profile-name").textContent = "គណនីបានផ្ទៀងផ្ទាត់។";
      }
    } catch (e) {
      status("បានចូលគណនី ប៉ុន្តែមិនអាចអាន Profile បាន។ សូមពិនិត្យ Firestore Rules។", "error");
    }
    status("ចូលគណនីបានជោគជ័យ!", "ok");
  });
}

$("send-code").addEventListener("click", async () => {
  if (!configReady()) return status("សូមកំណត់ Firebase config ក្នុង public/app.js ជាមុន។", "error");
  const phone = $("phone").value.trim();
  const playerName = $("playerName").value.trim();
  if (!/^\+[1-9]\d{7,14}$/.test(phone)) return status("សូមបញ្ចូលលេខទូរស័ព្ទជាទម្រង់អន្តរជាតិ ឧ. +85512345678។", "error");
  if (mode === "register" && (playerName.length < 3 || playerName.length > 20)) return status("ឈ្មោះអ្នកលេងត្រូវមាន 3–20 តួអក្សរ។", "error");
  $("send-code").disabled = true;
  try {
    if (recaptcha) { try { recaptcha.clear(); } catch {} }
    recaptcha = new RecaptchaVerifier(auth, "recaptcha-container", { size: "normal" });
    await recaptcha.render();
    confirmation = await signInWithPhoneNumber(auth, phone, recaptcha);
    $("otp-area").hidden = false;
    status("បានផ្ញើ OTP ប្រសិនបើ Firebase អនុញ្ញាត។ សូមពិនិត្យ SMS របស់អ្នក។", "ok");
  } catch (e) {
    console.error(e);
    status("មិនអាចផ្ញើ OTP បានទេ: " + (e.code || e.message) + "។ ពិនិត្យ Firebase Phone Auth, domain និង SMS region។", "error");
    if (recaptcha) { try { recaptcha.clear(); } catch {} recaptcha = null; }
  } finally {
    $("send-code").disabled = false;
  }
});

$("verify-code").addEventListener("click", async () => {
  const code = $("otp").value.trim();
  if (!confirmation) return status("សូមស្នើ OTP ជាមុន។", "error");
  if (!/^\d{6}$/.test(code)) return status("សូមបញ្ចូល OTP 6 ខ្ទង់។", "error");
  $("verify-code").disabled = true;
  try {
    const result = await confirmation.confirm(code);
    const user = result.user;
    const ref = doc(db, "players", user.uid);
    const existing = await getDoc(ref);
    if (mode === "register") {
      if (!existing.exists()) {
        await setDoc(ref, {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          playerName: $("playerName").value.trim(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
    } else if (!existing.exists()) {
      status("លេខនេះបានផ្ទៀងផ្ទាត់ ប៉ុន្តែមិនទាន់មាន Profile អ្នកលេង។ សូមជ្រើស បង្កើតគណនី។", "error");
      return;
    }
    status("ផ្ទៀងផ្ទាត់ជោគជ័យ!", "ok");
  } catch (e) {
    console.error(e);
    status("OTP មិនត្រឹមត្រូវ ឬផុតកំណត់។ សូមសាកល្បងម្ដងទៀត។", "error");
  } finally {
    $("verify-code").disabled = false;
  }
});

$("signout").addEventListener("click", async () => {
  try { await signOut(auth); status("បានចាកចេញពីគណនី។"); }
  catch (e) { status("មិនអាចចាកចេញបាន: " + e.message, "error"); }
});
