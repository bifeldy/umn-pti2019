/** Project Information */
const appName = 'PTI-2019 Mini API 🤭';
const appDescription = 'Delay Itu Bebas, Drop Itu Pilihan! 😉';
const appVersion = 'v1.0-BetA Release! 😱';
const appDev = ['Basilius Bias Astho Christyono 😈', 'Yehezkiel Gunawan 👿'];
const appDocumentation = 'https://documenter.getpostman.com/view/5658787/SW7W5pjd';
const appRepository = 'https://api.github.com/repos/Bifeldy/umn-pti2019';
const appRepositoryCommits = `${appRepository}/commits`;
const appRepositoryContributors = `${appRepository}/contributors`;

/** Our Library */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const externalRequest = require('request');
const readCsv = require('csvtojson');
const writeCsv = require('write-csv');

/** Our Server Settings */
const app = express();
const host = '0.0.0.0'; // Host On Current IP
const port = process.env.PORT || 80 || 8000 || 8080;

/** Our App Server */
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

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
    ukmDetail: './data/ukmDetail.csv',
    kantin: './data/kantin.csv',
    perpustakaan: './data/perpustakaan.csv',
    perpustakaanDetail: './data/perpustakaanDetail.csv',
    fasilitas: './data/fasilitas.csv',
    fasilitasDetail: './data/fasilitasDetail.csv',
};

/** Our Local Database */
let database = {
    users: [],
    userDetail: [],
    ukm: [],
    ukmDetail: [],
    kantin: [],
    perpustakaan: [],
    perpustakaanDetail: [],
    fasilitas: [],
    fasilitasDetail: []
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
        // Can Remember Login up To 1 Days
        expiresIn: remember_me ? (24*60*60) : jwtExpiredIn,
    });
}
function JwtDecode(token) {
    try { return jwt.verify(token, jwtSecretKey); }
    catch (error) { return error; }
}

/** Home Page */
app.get('/', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /`);
    externalRequest({
        url: appRepository,
        headers: {
            'User-Agent': 'request'
        }
    },
    (err, res, body) => {
        let githubResponse = {};
        if (!err && res.statusCode == 200) {
            const ghRes = JSON.parse(body);
            githubResponse = {
                id: ghRes.id,
                node_id:  ghRes.node_id,
                name:  ghRes.name,
                html_url: ghRes.html_url,
                owner: {
                    login: ghRes.owner.login,
                    id: ghRes.owner.id,
                    node_id: ghRes.owner.node_id,
                    avatar_url: ghRes.owner.avatar_url,
                    html_url: ghRes.owner.html_url,
                },
                license: {
                    key: ghRes.license.key,
                    name: ghRes.license.name,
                    spdx_id: ghRes.license.spdx_id,
                    url: ghRes.license.url,
                    node_id: ghRes.license.node_id
                },
                size: ghRes.size,
                open_issues_count: ghRes.open_issues_count,
                stargazers_count: ghRes.stargazers_count,
                watchers_count: ghRes.watchers_count,
                default_branch: ghRes.default_branch,
                language: ghRes.language,
                created_at: ghRes.created_at,
                updated_at: ghRes.updated_at,
                pushed_at: ghRes.pushed_at,
            };
        }
        response.json({
            message: `Selamat Datang Di ${appName}! 😍`,
            description: appDescription,
            version: appVersion,
            developers: appDev,
            github: githubResponse
        });
    });
});

/** API Page */
app.get('/api', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api`);
    externalRequest({
        url: appRepositoryCommits,
        headers: {
            'User-Agent': 'request'
        }
    },
    (err, res, body) => {
        let githubCommitsResponse = [];
        if (!err && res.statusCode == 200) {
            githubCommitsResponse = JSON.parse(body);
            delete githubCommitsResponse[0].author;
            delete githubCommitsResponse[0].committer;
        }
        externalRequest({
            url: appRepositoryContributors,
            headers: {
                'User-Agent': 'request'
            }
        },
        (err, res, body) => {
            let githubContributorsResponse = [];
            if (!err && res.statusCode == 200) {
                githubContributorsResponse = JSON.parse(body);
                for (let i=0; i<githubContributorsResponse.length; i++) {
                    delete githubContributorsResponse[i].gravatar_id;
                    delete githubContributorsResponse[i].followers_url;
                    delete githubContributorsResponse[i].following_url;
                    delete githubContributorsResponse[i].gists_url;
                    delete githubContributorsResponse[i].starred_url;
                    delete githubContributorsResponse[i].subscriptions_url;
                    delete githubContributorsResponse[i].organizations_url;
                    delete githubContributorsResponse[i].repos_url;
                    delete githubContributorsResponse[i].events_url;
                    delete githubContributorsResponse[i].received_events_url;
                    delete githubContributorsResponse[i].type;
                    delete githubContributorsResponse[i].site_admin;
                    delete githubContributorsResponse[i].contributions;
                }
            }
            response.json({
                info: 'Halaman Tembak-Tembak-an API PTI 2019 Ganjil! 😙',
                version: appVersion,
                documentation: appDocumentation,
                contributors: githubContributorsResponse,
                commit: githubCommitsResponse[0]
            });
        });
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
            token: JwtEncode({ ...user, ...database.userDetail[index] }, remember_me)
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
        'alamat' in newUserData &&
        'angkatan' in newUserData &&
        'prodi' in newUserData
    ) {
        const iNim = database.users.findIndex(u => u.nim == newUserData.nim);
        const iEmail = database.users.findIndex(u => u.email == newUserData.email);
        const iPhone = database.users.findIndex(u => u.telepon == newUserData.telepon);
        const index = Math.max(iNim, iEmail, iPhone);
        if (index >= 0) {
            let result = {};
            if (iNim >= 0) result.nim = 'NIM Sudah Terpakai! 😭';
            if (iEmail >= 0) result.email = 'Email Sudah Terpakai! 😭';
            if (iPhone >= 0) result.telepon = 'No. HP Sudah Terpakai! 😭';
            response.json({
                info: 'Gagal Mendaftarkan User Baru! T_T 😪',
                result
            });
        }
        else if (newUserData.password.length >= 128) {
            const currentTime = new Date().getTime();
            newUserData.id = database.users.length + 1;
            newUserData.nim = newUserData.nim.padStart(12, '0');
            if (!('foto' in newUserData)) newUserData.foto = 'https://via.placeholder.com/966x935';
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
                prodi: newUserData.prodi,
                angkatan: newUserData.angkatan,
                created_at: newUserData.created_at,
                updated_at: newUserData.updated_at
            }
            database.userDetail.push(newUserDetail);
            SaveDatabase('userDetail');
            const newUserWithoutPassword = newUser;
            delete newUserWithoutPassword.password;
            response.json({
                info: 'Berhasil Mendaftarkan User Baru! ^_^.~ 😁',
                token: JwtEncode(newUserWithoutPassword)
            });
        }
        else {
            response.json({
                info: 'Gagal Mendaftarkan User Baru! T_T 😪',
                message: 'Harap Daftar Dengan Mengirimkan Password Yang Sudah Di Hash Dengan SHA512! 🙄'
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
    if ('id' in request.params) {
        const parameter = request.params.id.replace(/[^0-9]+/g, '');
        if (parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/mahasiswa/${parameter}`);
            const index = database.users.findIndex(u => u.id == parseInt(parameter));
            if (index >= 0) {
                let mahasiswa = database.users[index];
                const mahasiswaDetail = database.userDetail[index];
                delete mahasiswa.password;
                response.json({
                    info: 'Mahasiswa Univ. Multimedia Nusantara 🤔',
                    result: {
                        ...mahasiswa,
                        ...mahasiswaDetail
                    }
                });
                return;
            }
        }
        response.json({
            info: 'Mahasiswa Univ. Multimedia Nusantara 🤔',
            message: 'User Yang Anda Cari Tidak Dapat Ditemukan~ 😏'
        });
    }
});
app.get('/api/mahasiswa', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/mahasiswa`);
    let mahasiswa = database.users;
    for (let i=0; i<mahasiswa.length; i++) {
        delete mahasiswa[i].password;
    }
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    try {
        if (sortBy == undefined || sortBy == '') throw 'defaultSortNumberAsc';
        else if (
            sortBy == 'id' || sortBy == 'anggota' ||
            sortBy == 'created_at' || sortBy == 'updated_at'
        ) {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortNumberAsc';
            else if (orderBy == 'asc') mahasiswa.sort((a, b) => a[sortBy] - b[sortBy]);
            else if (orderBy == 'desc') mahasiswa.sort((a, b) => b[sortBy] - a[sortBy]);
            else throw 'defaultSortNumberAsc';
        }
        else {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortWordAsc';
            else if (orderBy == 'asc') {
                mahasiswa.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else if (orderBy == 'desc') {
                mahasiswa.sort((a, b) => {
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else throw 'defaultSortWordAsc';
        }
    }
    catch (err) {
        if (err == 'defaultSortNumberAsc') mahasiswa.sort((a, b) => a.id - b.id);
        if (err == 'defaultSortWordAsc') {
            try {
                mahasiswa.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            catch (e) {
                mahasiswa.sort((a, b) => a.id - b.id);
            }
        }
    }
    response.json({
        info: 'Daftar Mahasiswa Univ. Multimedia Nusantara 🤔',
        result: {
            count: mahasiswa.length,
            mahasiswa
        }
    });
});
app.post('/api/update', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/update => ${JSON.stringify(request.body)}`);
    try { 
        const decoded = jwt.verify(request.body.token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if (
            (
                !('foto' in request.body) && !('nama_lengkap' in request.body) &&
                !('password' in request.body) && !('tanggal_lahir' in request.body) &&
                !('alamat' in request.body) && !('angkatan' in request.body) &&
                !('prodi' in request.body)
            ) ||
            database.userDetail[index].foto == request.body.foto ||
            database.users[index].nama_lengkap == request.body.nama_lengkap ||
            database.users[index].password == request.body.password ||
            database.userDetail[index].tanggal_lahir == request.body.tanggal_lahir ||
            database.userDetail[index].alamat == request.body.alamat ||
            database.userDetail[index].angkatan == request.body.angkatan ||
            database.userDetail[index].prodi == request.body.prodi
        ) {
            response.json({
                info: 'Tidak Ada Data Profil Yang Berubah! 😝',
                message: 'Hemn .. Menarik .. 🤯'
            });
        }
        else {
            const currentTime = new Date().getTime();
            if ('password' in request.body) {
                if (newUserData.password.length >= 128) {
                    database.users[index].password = request.body.password;
                }
                else {
                    response.json({
                        info: 'Gagal Memperbaharui Data Profil! 🤧',
                        message: 'Harap Daftar Dengan Mengirimkan Password Yang Sudah Di Hash Dengan SHA512! 🙄'
                    });
                    return;
                }
            }
            if ('foto' in request.body) database.userDetail[index].foto = request.body.foto;
            if ('nama_lengkap' in request.body) database.users[index].nama_lengkap = request.body.nama_lengkap;
            if ('tanggal_lahir' in request.body) database.userDetail[index].tanggal_lahir = request.body.tanggal_lahir;
            if ('alamat' in request.body) database.userDetail[index].alamat = request.body.alamat;
            if ('angkatan' in request.body) database.userDetail[index].angkatan = request.body.angkatan;
            if ('prodi' in request.body) database.userDetail[index].prodi = request.body.prodi;
            database.users[index].updated_at = currentTime;
            database.userDetail[index].updated_at = currentTime;
            SaveDatabase('users');
            response.json({
                info: 'Berhasil Memperbaharui Data Profil! 😝',
                token: JwtEncode(database.users[index])
            });
        }
    }
    catch (error) {
        response.json({
            info: 'Gagal Memperbaharui Data Profil! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** UKM -- Unit Kegiatan Mahasiswa */
app.get('/api/ukm/:kode', (request, response) => {
    if ('kode' in request.params) {
        const parameter = request.params.kode.replace(/[^0-9a-zA-Z]+/g, '');
        if (parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/ukm/${parameter}`);
            const index = database.ukm.findIndex(u => u.kode == parameter);
            if (index >= 0) {
                response.json({
                    info: 'Ekstrakurikuler Mahasiswa Univ. Multimedia Nusantara 🤔',
                    result: {
                        ...database.ukm[index],
                        ...database.ukmDetail[index]
                    }
                });
                return;
            }
        }
        response.json({
            info: 'Ekstrakurikuler Mahasiswa Univ. Multimedia Nusantara 🤔',
            message: 'Ekstrakurikuler Mahasiswa Yang Anda Cari Tidak Dapat Ditemukan~ 😏'
        });
    }
});
app.get('/api/ukm', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/ukm`);
    const ukm = database.ukm;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    try {
        if (sortBy == undefined || sortBy == '') throw 'defaultSortNumberAsc';
        else if (
            sortBy == 'id' || sortBy == 'anggota' ||
            sortBy == 'created_at' || sortBy == 'updated_at'
        ) {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortNumberAsc';
            else if (orderBy == 'asc') ukm.sort((a, b) => a[sortBy] - b[sortBy]);
            else if (orderBy == 'desc') ukm.sort((a, b) => b[sortBy] - a[sortBy]);
            else throw 'defaultSortNumberAsc';
        }
        else {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortWordAsc';
            else if (orderBy == 'asc') {
                ukm.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else if (orderBy == 'desc') {
                ukm.sort((a, b) => {
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else throw 'defaultSortWordAsc';
        }
    }
    catch (err) {
        if (err == 'defaultSortNumberAsc') ukm.sort((a, b) => a.id - b.id);
        if (err == 'defaultSortWordAsc') {
            try {
                ukm.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            catch (e) {
                ukm.sort((a, b) => a.id - b.id);
            }
        }
    }
    response.json({
        info: 'Daftar Unit Kegiatan Mahasiswa Yang Ada Di Univ. Multimedia Nusantara 😏',
        result: {
            count: ukm.length,
            ukm
        }
    });
});
app.post('/api/ukm', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/ukm => ${JSON.stringify(request.body)}`);
    try { 
        const decoded = jwt.verify(request.body.token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        //TODO:
    }
    catch (error) {
        response.json({
            info: 'Gagal Menambah Ekstrakurikuler Mahasiswa! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** Perpustakaan -- Buku, Jurnal & Skripsi */
app.get('/api/perpustakaan/:isbn', (request, response) => {
    if ('isbn' in request.params) {
        const parameter = request.params.isbn.replace(/[^0-9]+/g, '');
        if (parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/perpustakaan/${parameter}`);
            const index = database.perpustakaan.findIndex(u => u.isbn == parseInt(parameter));
            if (index >= 0) {
                response.json({
                    info: 'Pustaka Univ. Multimedia Nusantara 🤔',
                    result: {
                        ...database.perpustakaan[index],
                        ...database.perpustakaanDetail[index]
                    }
                });
                return;
            }
        }
        response.json({
            info: 'Pustaka Univ. Multimedia Nusantara 🤔',
            message: 'Pustaka Yang Anda Cari Tidak Dapat Ditemukan~ 😏'
        });
    }
});
app.get('/api/perpustakaan', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/perpustakaan`);
    const perpustakaan = database.perpustakaan;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    try {
        if (sortBy == undefined || sortBy == '') throw 'defaultSortNumberAsc';
        else if (
            sortBy == 'id' || sortBy == 'isbn' ||
            sortBy == 'created_at' || sortBy == 'updated_at'
        ) {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortNumberAsc';
            else if (orderBy == 'asc') perpustakaan.sort((a, b) => a[sortBy] - b[sortBy]);
            else if (orderBy == 'desc') perpustakaan.sort((a, b) => b[sortBy] - a[sortBy]);
            else throw 'defaultSortNumberAsc';
        }
        else {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortWordAsc';
            else if (orderBy == 'asc') {
                perpustakaan.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else if (orderBy == 'desc') {
                perpustakaan.sort((a, b) => {
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else throw 'defaultSortWordAsc';
        }
    }
    catch (err) {
        if (err == 'defaultSortNumberAsc') perpustakaan.sort((a, b) => a.id - b.id);
        if (err == 'defaultSortWordAsc') {
            try {
                perpustakaan.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            catch (e) {
                perpustakaan.sort((a, b) => a.id - b.id);
            }
        }
    }
    response.json({
        info: 'Daftar Buku, Jurnal & Skripsi (Bisa Minjam >= 3 Buku => Anda Tua!) 🤣',
        result: {
            count: perpustakaan.length,
            perpustakaan
        }
    });
});
app.post('/api/perpustakaan', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/perpustakaan => ${JSON.stringify(request.body)}`);
    try { 
        const decoded = jwt.verify(request.body.token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        //TODO:
    }
    catch (error) {
        response.json({
            info: 'Gagal Menambah Pustaka! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** Fasilitas -- Ruangan & Barang Perlengkapan */
app.get('/api/fasilitas/:kode', (request, response) => {
    if ('kode' in request.params) {
        const parameter = request.params.kode.replace(/[^0-9a-zA-Z]+/g, '');
        if (parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/fasilitas/${parameter}`);
            const index = database.fasilitas.findIndex(f => f.kode == parameter);
            if (index >= 0) {
                response.json({
                    info: 'Fasilitas Univ. Multimedia Nusantara 🤔',
                    result: {
                        ...database.fasilitas[index],
                        ...database.fasilitasDetail[index]
                    }
                });
                return;
            }
        }
        response.json({
            info: 'Fasilitas Univ. Multimedia Nusantara 🤔',
            message: 'Fasilitas Yang Anda Cari Tidak Dapat Ditemukan~ 😏'
        });
    }
});
app.get('/api/fasilitas', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/fasilitas`);
    const fasilitas = database.fasilitas;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    try {
        if (sortBy == undefined || sortBy == '') throw 'defaultSortNumberAsc';
        else if (
            sortBy == 'id' ||
            sortBy == 'created_at' || sortBy == 'updated_at'
        ) {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortNumberAsc';
            else if (orderBy == 'asc') fasilitas.sort((a, b) => a[sortBy] - b[sortBy]);
            else if (orderBy == 'desc') fasilitas.sort((a, b) => b[sortBy] - a[sortBy]);
            else throw 'defaultSortNumberAsc';
        }
        else {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortWordAsc';
            else if (orderBy == 'asc') {
                fasilitas.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else if (orderBy == 'desc') {
                fasilitas.sort((a, b) => {
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else throw 'defaultSortWordAsc';
        }
    }
    catch (err) {
        if (err == 'defaultSortNumberAsc') fasilitas.sort((a, b) => a.id - b.id);
        if (err == 'defaultSortWordAsc') {
            try {
                fasilitas.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            catch (e) {
                fasilitas.sort((a, b) => a.id - b.id);
            }
        }
    }
    response.json({
        info: 'Daftar Fasilitas Yang Biasanya Bisa Dipinjam Untuk Keperluan Mahasiswa 🤪',
        result: {
            count: fasilitas.length,
            fasilitas
        }
    });
});
app.post('/api/fasilitas', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/fasilitas => ${JSON.stringify(request.body)}`);
    try { 
        const decoded = jwt.verify(request.body.token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        //TODO:
    }
    catch (error) {
        response.json({
            info: 'Gagal Menambah Fasilitas! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** Kantin -- Barang Dagangan */
app.get('/api/kantin/:kode', (request, response) => {
    if ('kode' in request.params) {
        const parameter = request.params.kode.replace(/[^0-9a-zA-Z]+/g, '');
        if (parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/kantin/${parameter}`);
            const index = database.kantin.findIndex(k => k.kode == parameter);
            if (index >= 0) {
                response.json({
                    info: 'Jajanan Univ. Multimedia Nusantara 🤔',
                    result: {
                        ...database.kantin[index],
                        ...database.kantinDetail[index]
                    }
                });
                return;
            }
        }
        response.json({
            info: 'Jajanan Univ. Multimedia Nusantara 🤔',
            message: 'Jajanan Yang Anda Cari Tidak Dapat Ditemukan~ 😏'
        });
    }
});
app.get('/api/kantin', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/kantin`);
    const kantin = database.kantin;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    try {
        if (sortBy == undefined || sortBy == '') throw 'defaultSortNumberAsc';
        else if (
            sortBy == 'id' ||
            sortBy == 'created_at' || sortBy == 'updated_at'
        ) {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortNumberAsc';
            else if (orderBy == 'asc') kantin.sort((a, b) => a[sortBy] - b[sortBy]);
            else if (orderBy == 'desc') kantin.sort((a, b) => b[sortBy] - a[sortBy]);
            else throw 'defaultSortNumberAsc';
        }
        else {
            if (orderBy == undefined || orderBy == '') throw 'defaultSortWordAsc';
            else if (orderBy == 'asc') {
                kantin.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else if (orderBy == 'desc') {
                kantin.sort((a, b) => {
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            else throw 'defaultSortWordAsc';
        }
    }
    catch (err) {
        if (err == 'defaultSortNumberAsc') kantin.sort((a, b) => a.id - b.id);
        if (err == 'defaultSortWordAsc') {
            try {
                kantin.sort((a, b) => {
                    if (a[sortBy].toUpperCase() < b[sortBy].toUpperCase()) return -1;
                    if (a[sortBy].toUpperCase() > b[sortBy].toUpperCase()) return 1;
                    return 0;
                });
            }
            catch (e) {
                kantin.sort((a, b) => a.id - b.id);
            }
        }
    }
    response.json({
        info: 'Daftar Jajanan Kantin Univ. Multimedia Nusantara 😲',
        result: {
            count: kantin.length,
            kantin
        }
    });
});
app.post('/api/kantin', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/kantin => ${JSON.stringify(request.body)}`);
    try { 
        const decoded = jwt.verify(request.body.token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        //TODO:
    }
    catch (error) {
        response.json({
            info: 'Gagal Menambah Jajanan! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** Error 404 - Harus Paling Bawah */
app.get('*', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /notFound`);
    response.redirect(appDocumentation);
});

app.listen(port, host, () => console.log(`Server Running ${host}:${port} 🤐`));
module.exports = app;