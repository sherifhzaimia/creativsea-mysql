const puppeteer = require("puppeteer");
const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const port = process.env.PORT || 3000;

// إعداد اتصال بقاعدة البيانات
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME
});

db.connect((err) => {
  if (err) {
    console.error("خطأ في الاتصال بقاعدة البيانات:", err);
    return;
  }
  console.log("تم الاتصال بقاعدة البيانات بنجاح");
});

// تمكين CORS فقط للطلبات القادمة من https://app.inno-acc.com
app.use(cors({
  origin: 'https://app.inno-acc.com'
}));

async function extractSessionToken(res) {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-zygote",
        "--single-process",
      ]
    });

    const page = await browser.newPage();
    await page.goto("https://creativsea.com/my-account/", {
      waitUntil: "networkidle2",
      timeout: 120000,
    });

    await page.type("#username", "danielwidmer55477@gmail.com");
    await page.type("#password", "rankerfox.com#345");
    await page.click('button[name="login"]');
    await page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 });

    const cookies = await page.cookies();
    const sessionToken = cookies.find(
      (cookie) =>
        cookie.name === "wordpress_logged_in_69f5389998994e48cb1f2b3bcad30e49"
    );

    if (sessionToken) {
      const tokenData = {
        name: sessionToken.name,
        value: sessionToken.value,
        domain: sessionToken.domain,
        path: sessionToken.path,
        expires: sessionToken.expires,
        httpOnly: sessionToken.httpOnly,
        secure: sessionToken.secure,
      };

      // حفظ التوكين في قاعدة البيانات
      const query = "INSERT INTO session_tokens (name, value, domain, path, expires, httpOnly, secure) VALUES (?, ?, ?, ?, ?, ?, ?)";
      db.query(query, [tokenData.name, tokenData.value, tokenData.domain, tokenData.path, tokenData.expires, tokenData.httpOnly, tokenData.secure], (err, result) => {
        if (err) {
          console.error("خطأ أثناء تخزين التوكين في قاعدة البيانات:", err);
          res.json({ success: false, message: "خطأ أثناء تخزين التوكين في قاعدة البيانات." });
          return;
        }
        console.log("تم تخزين التوكين بنجاح في قاعدة البيانات");
        res.json({ success: true, token: tokenData });
      });
    } else {
      console.log("لم يتم العثور على توكين الجلسة.");
      res.json({ success: false, message: "لم يتم العثور على توكين الجلسة." });
    }

    await browser.close();
  } catch (error) {
    console.error("حدث خطأ:", error);
    res.status(500).json({ success: false, message: "حدث خطأ أثناء استخراج التوكين." });
  }
}

app.get("/start-session", (req, res) => {
  extractSessionToken(res);
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
