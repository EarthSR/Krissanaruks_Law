
const express = require('express');//
const mysql = require('mysql2');//เชื่อมต่อและทำงานกับฐานข้อมูล
const bcrypt = require('bcrypt');//ไลบรารีสำหรับการเข้ารหัสรหัสผ่านอย่างปลอดภัย
const app = express();
const port = 3000;

// สร้างการเชื่อมต่อกับฐานข้อมูล
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "1234",
    database: "shopdee"
});

db.connect(); //เชื่อมต่อmysql

// ใช้ middleware(คือฟังก์ชันที่เเปลงข้อมูลจากผู้ใช้ในรูปตามข้างล่าง)
app.use(express.json());    //เเปลงข้อมูลรูปเเบบJSON เป็น JavaScript object
app.use(express.urlencoded({ extended: true }));  //เเปลงข้อมูลรูปเเบบurlencoded เป็น JavaScript object

// APIเพิ่มข้อมูลสินค้า
app.post('/product', function (req, res) { //Post การที่เซิร์ฟเวอร์รับข้อมูลจากผู้ใช้ มักใช้ส่งข้อมูลที่ซับซ้อน
    const { productName, productDetail, price, cost, quantity } = req.body;

    // ใช้ Prepared Statements ป้องกัน SQL Injection(การโจมตีที่ทำให้ผู้โจมตีสามารถแทรกคำสั่ง SQLลงฐานข้อมูล)
    let sql = "INSERT INTO product (productName, productDetail, price, cost, quantity) VALUES (?, ?, ?, ?, ?)"; // ? ค่าที่ผู้ใช้ป้อนเข้ามาช่วยป้องกัน SQL Injection
    let values = [productName, productDetail, price, cost, quantity]; //สร้างvalueเพื่อเพิ่มข้อมูลใหม่ลงในฐานข้อมูล

    db.query(sql, values, function (err, result) {
        if (err) {
            // หากมีข้อผิดพลาดในการรันคำสั่ง SQL
            console.error(err); // แสดงข้อผิดพลาดในคอนโซล
            res.status(500).send({ 'message': 'เกิดข้อผิดพลาดในการบันทึกข้อมูล', 'status': false }); 
            return;
        }
        res.send({ 'message': 'บันทึกข้อมูลสำเร็จ', 'status': true });
    });
});

// APIดึงข้อมูลสินค้า
app.get('/product/:id', function (req, res) {
    const productID = parseInt(req.params.id, 10); // ดึงค่า id จาก URL และแปลงเป็นตัวเลข //parseInt ฟังก์ชันเเปลงstringเป็นตัวเลข

    // ตรวจสอบว่า productID เป็นตัวเลขมั้ย
    if (isNaN(productID)) { 
        res.status(400).send({ 'message': 'ID ไม่ถูกต้อง', 'status': false }); //massageไปผู้ใช้เหมือนเดิม
        return;
    }

    // ใช้ Prepared Statements ป้องกัน SQL Injection
    let sql = "SELECT * FROM product WHERE productID = ?"; //?คือค่าที่จะถูกเเทนที่ภายหลัง
    db.query(sql, [productID], function (err, result) { 
        if (err) { //ตรวจสอบว่ามีข้อผิดพลาดมั้ย
            console.error(err);  // แสดงข้อผิดพลาดในคอนโซล
            res.status(500).send({ 'message': 'เกิดข้อผิดพลาดในการดึงข้อมูล', 'status': false });  //massageไปผู้ใช้
            return;
        }
        res.send(result); //ส่งข้อมูลที่ดึงมากลับ
    });
});

// APIเข้าสู่ระบบ
app.post('/login', function (req, res) {
    const { username, password } = req.body;

    // ใช้ Prepared Statements ป้องกัน SQL Injection
    let sql = "SELECT * FROM customer WHERE username = ? AND isActive = 1"; //ดึงข้อมูลลูกค้าที่กำลังใช้งาน(isActive = 1)
    db.query(sql, [username], function (err, result) { //ฟังก์ชัน callback ,errเก็บข้อผิดพลาด ,resultเก็บผลลัพธ์
        if (err) {
            console.error(err); // แสดงข้อผิดพลาดในคอนโซล
            res.status(500).send({ 'message': 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'status': false }); //ส่งmssageให้ผู้ใช้
            return;
        }
        //ตรวจสอบว่ามีข้อมูลลูกค้ามั้ย
        if (result.length > 0) {
            let customer = result[0];

            // ตรวจสอบรหัสผ่านที่เข้ารหัสแล้ว(bcryptไลบราลีเปรียบเทียบรหัสผ่าน)
            bcrypt.compare(password, customer.password, function (err, isMatch) { //function cllback isMatch บอกว่ารหัสผ่านที่ผู้ใช้กรอกตรงในฐานข้อมูลมั้ย
                if (err) {
                    console.error(err);
                    res.status(500).send({ 'message': 'เกิดข้อผิดพลาดในการเข้าสู่ระบบ', 'status': false }); //ส่ง mssage back
                    return;
                }
                // ตรวจสอบว่าการเปรียบเทียบรหัสผ่านสำเร็จมั้ย
                if (isMatch) { 
                    customer['message'] = "เข้าสู่ระบบสำเร็จ";
                    customer['status'] = true;
                    res.send(customer); //// ส่งข้อมูลลูกค้าพร้อมข้อความและสถานะกลับไปยังผู้ใช้
                } else {
                    res.send({
                        "message": "กรุณาระบุรหัสผ่านใหม่อีกครั้ง",
                        "status": false
                    });
                }
            });
        } else { //กรอกใหม่
            res.send({
                "message": "กรุณาระบุรหัสผ่านใหม่อีกครั้ง",
                "status": false
            });
        }
    });
});

app.listen(port, function () { //ริ่มเซิร์ฟเวอร์ที่พอร์ต 3000
    console.log(`Server listening on port ${port}`); //แสดงข้อความว่าเซิร์ฟเวอร์กำลังฟังที่พอร์ต 3000
});