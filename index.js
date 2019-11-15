/** Project Information */
const appName = 'PTI-2019 Mini API 🤭';
const appDescription = 'Delay Itu Bebas, Drop Itu Pilihan! 😉';
const appVersion = 'v1.0-BetA Release! 😱';
const appDev = ['Basilius Bias Astho Christyono 😈', 'Yehezkiel Gunawan 👿'];
const appDocumentation = 'https://documenter.getpostman.com/view/5658787/SW7W5pjd';

/** Our Library */
const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const readCsv = require('csvtojson');
const writeCsv = require('write-csv');

/** Our Server Settings */
const app = express();
const host = '0.0.0.0'; // Host On Current IP
const port = process.env.PORT || 80 || 8000 || 8080;

/** Our App Server */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.listen(port, host, () => console.log(`Server Running ${host}:${port} 🤐`));

/** Our Global Variables Data */
const jwtAlgorithm = 'HS512';
const jwtIssuer = "BiasYehez-2016";
const jwtAudience = "MahasiswaPTI-2019";
const jwtSecretKey = "AsLabPTI-2019";
const jwtExpiredIn = 3*60; // 3 Minutes Login

// Alternative To Database Is Using .CSV Excel File
const csvFilePath = {
    users: './data/users.csv',
    userDetail: './data/userDetail.csv',
    ukm: './data/ukm.csv',
    kantin: './data/kantin.csv',
    perpustakaan: './data/perpustakaan.csv',
    fasilitas: './data/fasilitas.csv',
};

/** Our Local Database */
let database = {
    users: [],
    userDetail: [],
    ukm: [],
    kantin: [],
    perpustakaan: [],
    fasilitas: []
};

/** Saving Database By Writing CSV */
// https://www.npmjs.com/package/write-csv
// https://github.com/dsernst/write-csv
function SaveDatabase(dataKey) {
    writeCsv(csvFilePath[dataKey], database[dataKey]);
}
function SaveAllDatabase() {
    Object.keys(csvFilePath).forEach((key, index) => {
        writeCsv(csvFilePath[key], database[key]);
    });
}

/** Loading Database By Reading CSV */
// https://www.npmjs.com/package/csvtojson
// https://github.com/Keyang/node-csvtojson
Object.keys(csvFilePath).forEach((key, index) => {
    readCsv().fromFile(csvFilePath[key]).then((csvObjList) => {
        database[key] = csvObjList;
    });
});

/** JavaScript Web Token Helper */
function JwtEncode(user, remember_me) {
    return jwt.sign({user}, jwtSecretKey, {
        algorithm: jwtAlgorithm,
        issuer: jwtIssuer,
        audience: jwtAudience,
        // Can Remember Login up To 30 Days
        expiresIn: remember_me ? (30*24*60*60) : jwtExpiredIn,
    });
}
function JwtDecode(token) {
    try { return jwt.verify(token, jwtSecretKey); }
    catch(error) { return error; }
}
function JwtIsvalid(token) {
    try {
        jwt.verify(token, jwtSecretKey);
        return true;
    }
    catch(error) { return false; }
}

/** Home Page */
app.get('/', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /`);
    response.json({
        message: `Selamat Datang Di ${appName}! 😍`,
        description: appDescription,
        version: appVersion,
        developers: appDev
    });
});

/** API Page */
app.get('/api', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api`);
    response.json({
        info: 'Halaman Tembak-Tembak-an API PTI 2019 Ganjil! 😙',
        version: appVersion,
        developers: appDev
    });
});

/** User Login With (Nim/Email/Phone) And Returned JavaScript Web Token */
app.post('/api/login', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/login => ${JSON.stringify(request.body)}`);
    const index = database.users.findIndex(u =>
        (
            u.nim == request.body.user_name ||
            u.email == request.body.user_name ||
            u.telepon == request.body.user_name
        ) && 
        u.password == request.body.password
    );
    console.log(index);
    if (index >= 0) {
        const { password, ...user } = database.users[index];
        let remember_me = false
        if ('remember_me' in request.body) {
            if (JSON.parse(request.body.remember_me) == true) {
                remember_me = true
            }
        }
        response.json({
            info: 'Berhasil Login. Yeay! 🤩',
            token: JwtEncode(user, remember_me)
        });
    }
    else {
        response.json({
            info: 'Gagal Login. Hiksz! 😥',
            message: 'Username/Password Salah~ 🤤'
        });
    }
});

/** Verify & Get User Data */
app.post('/api/verify', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/verify => ${JSON.stringify(request.body)}`);
    response.json({
        info: 'User Selesai Di Verifikasi! UwUu~ 😚',
        result: JwtDecode(request.body.token)
    });
});

/** Register */
app.post('/api/register', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/register => ${JSON.stringify(request.body)}`);
    let newUserData = request.body;
    if (
        'nim' in newUserData &&
        'email' in newUserData &&
        'nama_lengkap' in newUserData &&
        'password' in newUserData &&
        'telepon' in newUserData &&
        'tanggal_lahir' in newUserData &&
        'alamat' in newUserData
    ) {
        const index = database.users.findIndex(u =>
            u.nim == request.body.nim || u.email == request.body.email || u.phone_number == request.body.phone_number
        );
        if (index >= 0) {
            response.json({
                info: 'Gagal Mendaftarkan User Baru! T_T 😪',
                message: 'Nim/Email/Telepon Sudah Terpakai! 😭'
            });
        }
        else {
            const currentTime = new Date().getTime();
            newUserData.id = database.users.length + 1;
            newUserData.nim = newUserData.nim.padStart(12, '0');
            newUserData.role = 'Mahasiswa';
            if (!('password' in newUserData)) newUserData.foto = 'https://via.placeholder.com/966x935';
            newUserData.created_at = currentTime;
            newUserData.updated_at = currentTime;
            newUser = {
                id: newUserData.id,
                nim: newUserData.nim,
                email: newUserData.email,
                nama_lengkap: newUserData.nama_lengkap,
                password: newUserData.password,
                telepon: newUserData.telepon,
                role: newUserData.role,
                created_at: newUserData.created_at,
                updated_at: newUserData.updated_at
            }
            database.users.push(newUser);
            SaveDatabase('users');
            newUserDetail = {
                id: newUserData.id,
                foto: newUserData.foto,
                tanggal_lahir: newUserData.tanggal_lahir,
                alamat: newUserData.alamat,
                created_at: newUserData.created_at,
                updated_at: newUserData.updated_at
            }
            database.userDetail.push(newUserDetail);
            SaveDatabase('userDetail');
            response.json({
                info: 'Berhasil Mendaftarkan User Baru! ^_^.~ 😁',
                token: JwtEncode(newUser)
            });
        }
    }
    else {
        response.json({
            info: 'Gagal Mendaftarkan User Baru! T_T 😒',
            message: 'Data Pendaftar Tidak Lengkap! 😦'
        });
    }
});

/** Mahasiswa -- Daftar Mahasiswa */
app.get('/api/mahasiswa/:id', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/mahasiswa/${request.params.id}`);
    if ('id' in request.params) {
        const index = database.userDetail.findIndex(u => u.id == parseInt(request.params.id));
        let mahasiswaDetail = database.userDetail[index];
        delete mahasiswaDetail.password;
        response.json({
            info: 'Mahasiswa Univ. Multimedia Nusantara 🤔',
            result: {
                mahasiswa: mahasiswaDetail
            }
        });
    }
});
app.get('/api/mahasiswa', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/mahasiswa`);
    let mahasiswa = database.users;
    for (let i=0; i<mahasiswa.length; i++) {
        // delete mahasiswa[i].password;
    }
    response.json({
        info: 'Daftar Mahasiswa Univ. Multimedia Nusantara 🤔',
        result: {
            count: mahasiswa.length,
            user: mahasiswa
        }
    });
});
app.post('/api/update', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/update => ${JSON.stringify(request.body)}`);
    if (JwtIsvalid(request.body.token)) {
        const decoded = JwtDecode(request.body.token);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if (
            (!('foto' in request.body) && !('nama_lengkap' in request.body) && !('password' in request.body) && 
            !('tanggal_lahir' in request.body) && !('alamat' in request.body)) ||
            database.userDetail[index].foto == request.body.foto ||
            database.users[index].nama_lengkap == request.body.nama_lengkap ||
            database.users[index].password == request.body.password ||
            database.userDetail[index].tanggal_lahir == request.body.tanggal_lahir ||
            database.userDetail[index].alamat == request.body.alamat
        ) {
            response.json({
                info: 'Tidak Ada Data Profil Yang Berubah! 😝',
                message: 'Hemn .. Menarik .. 🤯'
            });
        }
        else {
            const currentTime = new Date().getTime();
            if ( 'foto' in request.body ) database.userDetail[index].foto = request.body.foto;
            if ( 'nama_lengkap' in request.body ) database.users[index].nama_lengkap = request.body.nama_lengkap;
            if ( 'password' in request.body ) database.users[index].password = request.body.password;
            if ( 'tanggal_lahir' in request.body ) database.userDetail[index].tanggal_lahir = request.body.tanggal_lahir;
            if ( 'alamat' in request.body ) database.userDetail[index].alamat = request.body.alamat;
            database.users[index].updated_at = currentTime;
            database.userDetail[index].updated_at = currentTime;
            SaveDatabase('users');
            response.json({
                info: 'Berhasil Memperbaharui Data Profil! 😝',
                token: JwtEncode(database.users[index])
            });
        }
    }
    else {
        response.json({
            info: 'Gagal Memperbaharui Data Profil! 🤧',
            message: 'Akses Ditolak! 😷'
        });
    }
});

/** UKM -- Unit Kegiatan Mahasiswa */
app.get('/api/ukm', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/ukm`);
    response.json({
        info: 'Daftar Unit Kegiatan Mahasiswa Yang Ada Di Univ. Multimedia Nusantara 😏',
        result: {
            count: database.ukm.length,
            ukm: database.ukm
        }
    });
});
app.post('/api/ukm', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/ukm => ${JSON.stringify(request.body)}`);
    // TODO:
});

/** Kantin -- Barang Dagangan */
app.get('/api/kantin', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/kantin`);
    response.json({
        info: 'Daftar Menu Makanan & Minuman Kantin Univ. Multimedia Nusantara 😲',
        result: {
            count: database.kantin.length,
            kantin: database.kantin
        }
    });
});
app.post('/api/kantin', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/kantin => ${JSON.stringify(request.body)}`);
    // TODO:
});

/** Perpustakaan -- Buku, Jurnal & Skripsi */
app.get('/api/perpustakaan', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/perpustakaan`);
    response.json({
        info: 'Daftar Buku, Jurnal & Skripsi (Bisa Minjam >= 3 Buku => Anda Tua!) 🤣',
        result: {
            count: database.perpustakaan.length,
            perpustakaan: database.perpustakaan
        }
    });
});
app.post('/api/perpustakaan', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/perpustakaan => ${JSON.stringify(request.body)}`);
    // TODO:
});

/** Fasilitas -- Ruangan & Barang Perlengkapan */
app.get('/api/fasilitas', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/fasilitas`);
    response.json({
        info: 'Daftar Fasilitas Yang Biasanya Bisa Dipinjam Untuk Keperluan Mahasiswa 🤪',
        result: {
            count: database.fasilitas.length,
            fasilitas: database.fasilitas
        }
    });
});
app.post('/api/fasilitas', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/fasilitas => ${JSON.stringify(request.body)}`);
    // TODO:
});

/** 404- Harus Paling Bawah */
app.get('*', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /notFound`);
    response.redirect(appDocumentation);
});