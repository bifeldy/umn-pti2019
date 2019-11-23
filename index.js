/** Project Information */
const appName = 'PTI-2019 Mini API 🤭';
const appDescription = 'Delay Itu Bebas, Drop Itu Pilihan! 😉';
const appVersion = 'v1.0 Official Release! 😱';
const appDev = ['Basilius Bias Astho Christyono 😈', 'Yehezkiel Gunawan 👿'];
const appDocumentation = 'https://documenter.getpostman.com/view/5658787/SW7W5pjd';
const appRepository = 'https://api.github.com/repos/Bifeldy/umn-pti2019';
const appRepositoryCommits = `${appRepository}/commits`;
const appRepositoryContributors = `${appRepository}/contributors`;
const appGoogleSheetId = '1G-VvfqwaObT-DfkiYA-_CTa7DapPpr7XFG2rGGb1HVY';

/** Our Library */
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const externalRequest = require('request');
const favicon = require('serve-favicon');
const path = require('path');

/** Google Sheet API */
const { google } = require('googleapis');

var googleApiKey, googleClient, gsApi;
function InitializeGoogleAPI() {
    try {
        googleApiKey = require('./umn-pti2019-apiKey.json');
    }
    catch(errorLoadCredential) {
        console.log(`Google Credential File Not Found! './umn-pti2019-apiKey.json'`);
        console.log(`Using Alternate Config 'process.env.umn_pti2019_apiKey'`);
        googleApiKey = JSON.parse(process.env.umn_pti2019_apiKey);
    }
    googleClient = new google.auth.JWT(
        googleApiKey.client_email,
        null,
        googleApiKey.private_key,
        ['https://www.googleapis.com/auth/spreadsheets']
    );
}
function GenerateNewSessionToGoogleAPI() {
    googleClient.authorize((err, result) => {
        if(err) {
            console.log(err);
            return;
        }
        console.log(`Connected to Google Docs SpreadSheet!`);
        console.log(`Client :: ${googleClient.email}`);
        console.log(`Token Expiry Date :: ${new Date(result.expiry_date)}`);
    });
    gsApi = google.sheets({
        version: "v4",
        auth: googleClient
    });
}
InitializeGoogleAPI();
GenerateNewSessionToGoogleAPI();

/** Our Server Settings */
const app = express();
const host = '0.0.0.0'; // Host On Current IP (Local & Public)
const port = process.env.PORT || 80;

/** Our App Server */
app.use(favicon(path.join(__dirname, 'favicon.ico')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cors());

/** Our Global Variables Data */
const jwtAlgorithm = 'HS512';
const jwtIssuer = "BiasYehez-2016";
const jwtAudience = "MahasiswaPTI-2019";
const jwtSecretKey = "AsLabPTI-2019";
const jwtExpiredIn = 3*60; // 3 Minutes Login

// Google Sheet Worksheet Tab Name
const googleDocsWorksheet = [
    'fasilitas',
    'fasilitasDetail',
    'kantin',
    'kantinDetail',
    'perpustakaan',
    'perpustakaanDetail',
    'ukm',
    'ukmDetail',
    'mahasiswa',
    'mahasiswaDetail',
    'users',
    'userFavorites'
];

/** Our Local Database */
let database = {
    fasilitas: [],
    fasilitasDetail: [],
    kantin: [],
    kantinDetail: [],
    perpustakaan: [],
    perpustakaanDetail: [],
    ukm: [],
    ukmDetail: [],
    mahasiswa: [],
    mahasiswaDetail: [],
    users: [],
    userFavorites: []
};

/** Loading Database By Reading To GoogleSheet */
function LoadGoogleSheetData(workSheetTabName) {
    return gsApi.spreadsheets.values.get({
        spreadsheetId: appGoogleSheetId,
        range: workSheetTabName
    }).then(data => {
        const tempArr = [];
        const tempKey = data.data.values[0];
        const tempData = data.data.values;
        tempData.shift();
        tempData.map(item => {
            const tempObj = {};
            item.forEach((_, index) => {
                tempObj[tempKey[index]] = item[index];
            });
            tempArr.push(tempObj);
        });
        database[workSheetTabName] = tempArr;
        return tempKey;
    }).catch(err => console.log(err));
}
async function RefreshGoogleSheetData() {
    googleDocsWorksheet.forEach(workSheet => {
        LoadGoogleSheetData(workSheet);
    });
}
RefreshGoogleSheetData();

/** Saving Database By Writing To GoogleSheet */
async function WriteUpdateGoogleSheetData(workSheetTab, workSheetTabDataObject) {
    await GenerateNewSessionToGoogleAPI();
    const updateUser = [];
    const tempKey = await LoadGoogleSheetData(workSheetTab);
    tempKey.forEach(key => {
        updateUser.push(workSheetTabDataObject[key]);
    });
    gsApi.spreadsheets.values.update({
        spreadsheetId: appGoogleSheetId,
        range: `${workSheetTab}!A${parseInt(workSheetTabDataObject.id)+1}`,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [updateUser]
        }
    }).then(res => {
        console.log(`Update :: ${workSheetTab}`);
        RefreshGoogleSheetData();
    }).catch(err => console.log(err));
}
async function WriteAppendGoogleSheetData(workSheetTab, workSheetTabDataObject) {
    await GenerateNewSessionToGoogleAPI();
    const registerUser = [];
    const tempKey = await LoadGoogleSheetData(workSheetTab);
    tempKey.forEach(key => {
        registerUser.push(workSheetTabDataObject[key]);
    });
    gsApi.spreadsheets.values.append({
        spreadsheetId: appGoogleSheetId,
        range: workSheetTab,
        valueInputOption: 'USER_ENTERED',
        resource: {
            values: [registerUser]
        }
    }).then(res => {
        console.log(`Write :: ${workSheetTab}`);
        RefreshGoogleSheetData();
    }).catch(err => console.log(err));
}
async function AddNewDataToGoogleSheet(object, objectDetail, requestBody, resp) {
    GenerateNewSessionToGoogleAPI();
    let newObject = {};
    let newObjectDetail = {};
    const currentTime = new Date().getTime();
    const tempKey = await LoadGoogleSheetData(object);
    for(let i=1; i<tempKey.length-2; i++) {
        if (
            requestBody[tempKey[i]] == undefined ||
            requestBody[tempKey[i]] == null ||
            requestBody[tempKey[i]] == ''
        ) {
            return resp.status(400).json({
                info: 'Gagal Menambahkan Data! 🤤',
                message: 'Data Tidak Lengkap! 😦'
            });
        }
    }
    tempKey.forEach(key => {
        newObject[key] = requestBody[key];
    });
    newObject.id = database[object].length + 1;
    newObject.created_at = currentTime;
    newObject.updated_at = currentTime;
    const tempKeyDetail = await LoadGoogleSheetData(objectDetail);
    for(let i=1; i<tempKeyDetail.length-2; i++) {
        if (
            requestBody[tempKeyDetail[i]] == undefined ||
            requestBody[tempKeyDetail[i]] == null ||
            requestBody[tempKeyDetail[i]] == ''
        ) {
            return resp.status(400).json({
                info: 'Gagal Menambahkan Data! 🤤',
                message: 'Data Tidak Lengkap! 😦'
            });
        }
    }
    tempKeyDetail.forEach(key => {
        newObjectDetail[key] = requestBody[key];
    });
    newObjectDetail.id = database[objectDetail].length + 1;
    newObjectDetail.created_at = currentTime;
    newObjectDetail.updated_at = currentTime;
    await WriteAppendGoogleSheetData(object, {...newObject});
    await WriteAppendGoogleSheetData(objectDetail, {...newObjectDetail});
    await RefreshGoogleSheetData();
    resp.json({
        info: 'Berhasil Menambahkan Data! ^_^.~ 😁',
        result: {...newObject, ...newObjectDetail}
    });
}

/** JavaScript Web Token Helper */
function JwtEncode(user, remember_me = false) {
    return jwt.sign({user}, jwtSecretKey, {
        algorithm: jwtAlgorithm,
        issuer: jwtIssuer,
        audience: jwtAudience,
        // Can Remember Login up To 1 Days
        expiresIn: remember_me == true ? (24*60*60) : jwtExpiredIn,
    });
}

/** Default Response Data NotFound */
function ResponseJsonDataNotFound(response, info, message) {
    return response.status(404).json({info, message});
}

/** Home Page */
app.get('/', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /`);
    response.sendfile('./Information.png');
//     externalRequest({
//         url: appRepository,
//         headers: {
//             'User-Agent': 'request'
//         }
//     },
//     (err, res, body) => {
//         let githubResponse = {};
//         if(!err && res.statusCode == 200) {
//             const ghRes = JSON.parse(body);
//             githubResponse = {
//                 id: ghRes.id,
//                 node_id:  ghRes.node_id,
//                 name:  ghRes.name,
//                 html_url: ghRes.html_url,
//                 owner: {
//                     login: ghRes.owner.login,
//                     id: ghRes.owner.id,
//                     node_id: ghRes.owner.node_id,
//                     avatar_url: ghRes.owner.avatar_url,
//                     html_url: ghRes.owner.html_url,
//                 },
//                 license: {
//                     key: ghRes.license.key,
//                     name: ghRes.license.name,
//                     spdx_id: ghRes.license.spdx_id,
//                     url: ghRes.license.url,
//                     node_id: ghRes.license.node_id
//                 },
//                 size: ghRes.size,
//                 open_issues_count: ghRes.open_issues_count,
//                 stargazers_count: ghRes.stargazers_count,
//                 watchers_count: ghRes.watchers_count,
//                 default_branch: ghRes.default_branch,
//                 language: ghRes.language,
//                 created_at: ghRes.created_at,
//                 updated_at: ghRes.updated_at,
//                 pushed_at: ghRes.pushed_at,
//             };
//         }
//         response.json({
//             message: `Selamat Datang Di ${appName}! 😍`,
//             description: appDescription,
//             version: appVersion,
//             developers: appDev,
//             github: githubResponse
//         });
//     });
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
        if(!err && res.statusCode == 200) {
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
            if(!err && res.statusCode == 200) {
                githubContributorsResponse = JSON.parse(body);
                for(let i=0; i<githubContributorsResponse.length; i++) {
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

/** User Login With (Email/Phone) And Returned JavaScript Web Token */
app.post('/api/login', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/login => ${JSON.stringify(request.body)}`);
    if ('user_name' in request.body && 'password' in request.body) {
        const index = database.users.findIndex(u =>
            (
                u.user_name == request.body.user_name.toLowerCase() ||
                u.email == request.body.user_name.toLowerCase() ||
                u.telepon == request.body.user_name
            ) &&
            u.password == request.body.password
        );
        if(index >= 0) {
            const { password, ...user } = database.users[index];
            const remember_me = ('remember_me' in request.body && JSON.parse(request.body.remember_me) == true);
            response.json({
                info: 'Berhasil Login. Yeay! 🤩',
                token: JwtEncode(user, remember_me)
            });
            return;
        }
    }
    response.status(400).json({
        info: 'Gagal Login. Hiksz! 😥',
        message: 'Username/Password Salah~ 🤤'
    });
});

/** Verify & Get User Data */
app.post('/api/verify', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/verify => ${JSON.stringify(request.body)}`);
    try {
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        response.json({
            info: 'User Selesai Di Verifikasi! UwUu~ 😚',
            result: decoded
        });
    }
    catch(error) {
        response.status(401).json({
            info: 'User Gagal Di Verifikasi! Hikz~ 🤨',
            result: error
        });
    }
});

/** Register */
app.post('/api/register', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/register => ${JSON.stringify(request.body)}`);
    let newUserData = request.body;
    if (
        'user_name' in newUserData && newUserData.user_name != null &&  newUserData.user_name != '' &&  newUserData.user_name != undefined &&
        'telepon' in newUserData && newUserData.telepon != null &&  newUserData.telepon != '' &&  newUserData.telepon != undefined &&
        'email' in newUserData && newUserData.email != null &&  newUserData.email != '' &&  newUserData.email != undefined &&
        'nama_lengkap' in newUserData && newUserData.nama_lengkap != null &&  newUserData.nama_lengkap != '' &&  newUserData.nama_lengkap != undefined &&
        'alamat' in newUserData && newUserData.alamat != null &&  newUserData.alamat != '' &&  newUserData.alamat != undefined &&
        'tanggal_lahir' in newUserData && newUserData.tanggal_lahir != null &&  newUserData.tanggal_lahir != '' &&  newUserData.tanggal_lahir != undefined &&
        'password' in newUserData && newUserData.password != null &&  newUserData.password != '' &&  newUserData.password != undefined
    ) {
        newUserData.telepon = newUserData.telepon.replace(/[^0-9]+/g, '');
        newUserData.user_name = newUserData.user_name.replace(/[^0-9a-zA-Z]+/g, '');
        if(newUserData.telepon != '' && newUserData.user_name != '') {
            const iUserName = database.users.findIndex(u => u.user_name == newUserData.user_name.toLowerCase());
            const iPhone = database.users.findIndex(u => u.telepon == newUserData.telepon);
            const iEmail = database.users.findIndex(u => u.email == newUserData.email.toLowerCase());
            const index = Math.max(iUserName, iEmail, iPhone);
            if(index >= 0) {
                let result = {};
                if(iUserName >= 0) result.user_name = 'Username Sudah Terpakai! 😭';
                if(iEmail >= 0) result.email = 'Email Sudah Terpakai! 😭';
                if(iPhone >= 0) result.telepon = 'No. HP Sudah Terpakai! 😭';
                response.status(400).json({
                    info: 'Gagal Mendaftarkan User Baru! T_T 😪',
                    result
                });
            }
            else if(newUserData.password.length >= 128) {
                const currentTime = new Date().getTime();
                newUserData.id = database.users.length + 1;
                if(!('foto' in newUserData)) newUserData.foto = 'https://via.placeholder.com/966x935';
                newUserData.created_at = currentTime;
                newUserData.updated_at = currentTime;
                const newUser = {
                    id: newUserData.id,
                    user_name: newUserData.user_name.toLowerCase(),
                    telepon: newUserData.telepon,
                    email: newUserData.email.toLowerCase(),
                    nama_lengkap: newUserData.nama_lengkap,
                    alamat: newUserData.alamat,
                    tanggal_lahir: newUserData.tanggal_lahir,
                    foto: newUserData.foto,
                    password: newUserData.password,
                    created_at: newUserData.created_at,
                    updated_at: newUserData.updated_at
                }
                WriteAppendGoogleSheetData('users', {...newUser});
                const newUserWithoutPassword = newUser;
                delete newUserWithoutPassword.password;
                response.json({
                    info: 'Berhasil Mendaftarkan User Baru! ^_^.~ 😁',
                    token: JwtEncode(newUserWithoutPassword)
                });
            }
            else {
                response.status(400).json({
                    info: 'Gagal Mendaftarkan User Baru! T_T 😪',
                    message: 'Harap Daftar Dengan Mengirimkan Password Yang Sudah Di Hash Dengan SHA512! 🙄'
                });
            }
            return;
        }
    }
    response.status(400).json({
        info: 'Gagal Mendaftarkan User Baru! T_T 😒',
        message: 'Data Pendaftar Tidak Lengkap! 😦'
    });
});

/** User Profile */
app.get('/api/user/:user_name', (request, response) => {
    if('user_name' in request.params) {
        const parameter = request.params.user_name.replace(/[^0-9a-zA-Z]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/user/${parameter}`);
            const index = database.users.findIndex(u => u.user_name == parameter.toLowerCase());
            const user = {...database.users[index]};
            delete user.password;
            if(index >= 0) {
                response.json({
                    info: 'Data Profile User 🤔',
                    result: user
                });
                return;
            }
        }
    }
    ResponseJsonDataNotFound(response, 'Data Profile User 🤔', 'User Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
});
app.post('/api/update', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/update => ${JSON.stringify(request.body)}`);
    try {
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if(index >= 0) {
            if (
                (
                    !('nama_lengkap' in request.body) && !('alamat' in request.body) &&
                    !('tanggal_lahir' in request.body) && !('foto' in request.body) &&
                    !('password' in request.body)
                ) ||
                database.users[index].nama_lengkap == request.body.nama_lengkap ||
                database.users[index].alamat == request.body.alamat ||
                database.users[index].tanggal_lahir == request.body.tanggal_lahir ||
                database.users[index].foto == request.body.foto ||
                database.users[index].password == request.body.password
            ) {
                response.json({
                    info: 'Tidak Ada Data Profil Yang Berubah! 😝',
                    message: 'Hemn .. Menarik .. 🤯'
                });
            }
            else {
                const currentTime = new Date().getTime();
                if('password' in request.body) {
                    if(newUserData.password.length >= 128) {
                        database.users[index].password = request.body.password;
                    }
                    else {
                        response.status(400).json({
                            info: 'Gagal Memperbaharui Data Profil! 🤧',
                            message: 'Harap Daftar Dengan Mengirimkan Password Yang Sudah Di Hash Dengan SHA512! 🙄'
                        });
                        return;
                    }
                }
                if('nama_lengkap' in request.body) database.users[index].nama_lengkap = request.body.nama_lengkap;
                if('alamat' in request.body) database.users[index].alamat = request.body.alamat;
                if('tanggal_lahir' in request.body) database.users[index].tanggal_lahir = request.body.tanggal_lahir;
                if('foto' in request.body) database.users[index].foto = request.body.foto;
                database.users[index].updated_at = currentTime;
                WriteUpdateGoogleSheetData('users', {...database.users[index]});
                response.json({
                    info: 'Berhasil Memperbaharui Data Profil! 😝',
                    token: JwtEncode(database.users[index])
                });
            }
        }
        else {
            response.status(400).json({
                info: 'Gagal Memperbaharui Data Profil! 🤐 User Tidak Ada! 😑',
                result: error
            });
        }
    }
    catch (error) {
        response.status(401).json({
            info: 'Gagal Memperbaharui Data Profil! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});
app.get('/api/user/:user_name/favorites', (request, response) => {
    if('user_name' in request.params) {
        const parameter = request.params.user_name.replace(/[^0-9a-zA-Z]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/user/${parameter}/favorites`);
            const index = database.users.findIndex(u => u.user_name == parameter.toLowerCase());
            if(index >= 0) {
                let favorites = database.userFavorites.filter(fav => fav.user_name == database.users[index].user_name);
                const typeBy = request.query['type'];
                if(typeBy) {
                    favorites = favorites.filter(fv => fv.type == typeBy);
                    const sortBy = request.query['sort'];
                    const orderBy = request.query['order'];
                    if(sortBy) {
                        try {
                            favorites.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
                            if(orderBy == 'desc') {
                                favorites.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
                            }
                        }
                        catch (err) {
                            favorites.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
                            if(orderBy == 'desc') {
                                favorites.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
                            }
                        }
                    }
                }
                response.json({
                    info: 'Data Favorite User 🤔',
                    result: favorites
                });
                return;
            }
        }
    }
    ResponseJsonDataNotFound(response, 'Data Favorite User 🤔', 'Data Favorite Dari User Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
});

/** Searching */
app.get('/api/search', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/search`);
    const queryBy = request.query['query'].replace(/[^0-9a-zA-Z]+/g, '');
    if(queryBy) {
        GenerateNewSessionToGoogleAPI();
        RefreshGoogleSheetData();
        let search_result = {
            search_fasilitas: [],
            search_kantin: [],
            search_perpustakaan: [],
            search_ukm: [],
            search_mahasiswa: [],
            search_users: [],
        };
        //TODO: Search Through All Arrays Of Object
        //
        //
        //
        //TODO: Search Through All Arrays Of Object
        const typeBy = request.query['type'];
        if(typeBy) {
            const sortBy = request.query['sort'];
            const orderBy = request.query['order'];
            if(sortBy) {
                try {
                    Object.keys(search_result).forEach(key => {
                        search_result[key].sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
                    });
                    if(orderBy == 'desc') {
                        Object.keys(search_result).forEach(key => {
                            search_result[key].sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
                        });
                    }
                }
                catch (err) {
                    Object.keys(search_result).forEach(key => {
                        search_result[key].sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
                    });
                    if(orderBy == 'desc') {
                        Object.keys(search_result).forEach(key => {
                            search_result[key].sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
                        });
                    }
                }
            }
        }
        response.json({
            info: `Pencarian Data '${typeBy}' Diurutkan Berdasarkan '${sortBy}' Secara '${orderBy}' .. 🤔`,
            message: 'Sayangnya Fitur Pencarian Data Secara Global Masih Belum Ada .. 😥'
        });
        return;
    }
    ResponseJsonDataNotFound(response, 'Pencarian Data 😑', 'Tidak Ada Kata Kunci Yang Diberikan~ 😥');
});

/** Mahasiswa -- Daftar Mahasiswa */
app.get('/api/mahasiswa/:nim', (request, response) => {
    if('nim' in request.params) {
        const parameter = request.params.nim.replace(/[^0-9]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/mahasiswa/${parameter}`);
            const index = database.mahasiswa.findIndex(u => u.nim == parseInt(parameter));
            if(index >= 0) {
                response.json({
                    info: 'Mahasiswa Univ. Multimedia Nusantara 🤔',
                    result: {
                        ...database.mahasiswa[index],
                        ...database.mahasiswaDetail[index]
                    }
                });
                return;
            }
        }
    }
    ResponseJsonDataNotFound(response, 'Mahasiswa Univ. Multimedia Nusantara 🤔', 'Mahasiswa Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
});
app.get('/api/mahasiswa', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/mahasiswa`);
    const mahasiswa = database.mahasiswa;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    if(sortBy) {
        try {
            mahasiswa.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
            if(orderBy == 'desc') {
                mahasiswa.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
        }
        catch (err) {
            mahasiswa.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
            if(orderBy == 'desc') {
                mahasiswa.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
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
app.post('/api/mahasiswa', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/mahasiswa => ${JSON.stringify(request.body)}`);
    try { 
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if(index >= 0) {
            const iNim = database.mahasiswa.findIndex(mhs => mhs.nim == request.body.nim);
            const iEmail = database.mahasiswa.findIndex(mhs => mhs.email == request.body.email);
            const iPhone = database.mahasiswaDetail.findIndex(mhs => mhs.telepon == request.body.telepon);
            const idx = Math.max(iNim, iEmail, iPhone);
            if(idx >= 0) {
                let result = {};
                if(iNim >= 0) result.nim = 'NIM Sudah Terpakai! 😭';
                if(iEmail >= 0) result.email = 'Email Sudah Terpakai! 😭';
                if(iPhone >= 0) result.telepon = 'No. HP Sudah Terpakai! 😭';
                response.status(400).json({
                    info: 'Gagal Menambah Mahasiswa! 🤧 Data Sudah Ada! 😗',
                    result
                });
            }
            else AddNewDataToGoogleSheet('mahasiswa', 'mahasiswaDetail', request.body, response);
        }
        else {
            throw 'Harap Melakukan Login Ulang! 😯';
        }
    }
    catch (error) {
        response.status(401).json({
            info: 'Gagal Menambah Mahasiswa! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** UKM -- Unit Kegiatan Mahasiswa */
app.get('/api/ukm/:kode', (request, response) => {
    if('kode' in request.params) {
        const parameter = request.params.kode.replace(/[^0-9a-zA-Z]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/ukm/${parameter}`);
            const index = database.ukm.findIndex(u => u.kode == parameter);
            if(index >= 0) {
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
    }
    ResponseJsonDataNotFound(response, 'Ekstrakurikuler Mahasiswa Univ. Multimedia Nusantara 🤔', 'Ekstrakurikuler Mahasiswa Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
});
app.get('/api/ukm', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/ukm`);
    const ukm = database.ukm;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    if(sortBy) {
        try {
            ukm.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
            if(orderBy == 'desc') {
                ukm.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
        }
        catch (err) {
            ukm.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
            if(orderBy == 'desc') {
                ukm.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
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
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if(index >= 0) {
            const iKode = database.ukm.findIndex(uk => uk.kode == request.body.kode);
            if(iKode >= 0) {
                let result = {};
                if(iKode >= 0) result.kode = 'Kode Sudah Terpakai! 😭';
                response.status(400).json({
                    info: 'Gagal Menambah Ekstrakurikuler! 🤧 Data Sudah Ada! 😗',
                    result
                });
            }
            else AddNewDataToGoogleSheet('ukm', 'ukmDetail', request.body, response);
        }
        else {
            throw 'Harap Melakukan Login Ulang! 😯';
        }
    }
    catch (error) {
        response.status(401).json({
            info: 'Gagal Menambah Ekstrakurikuler Mahasiswa! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** Perpustakaan -- Buku, Jurnal & Skripsi */
app.get('/api/perpustakaan/:isbn', (request, response) => {
    if('isbn' in request.params) {
        const parameter = request.params.isbn.replace(/[^0-9]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/perpustakaan/${parameter}`);
            const index = database.perpustakaan.findIndex(u => u.isbn == parseInt(parameter));
            if(index >= 0) {
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
    }
    ResponseJsonDataNotFound(response, 'Pustaka Univ. Multimedia Nusantara 🤔', 'Pustaka Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
});
app.get('/api/perpustakaan', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/perpustakaan`);
    const perpustakaan = database.perpustakaan;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    if(sortBy) {
        try {
            perpustakaan.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
            if(orderBy == 'desc') {
                perpustakaan.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
        }
        catch (err) {
            perpustakaan.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
            if(orderBy == 'desc') {
                perpustakaan.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
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
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if(index >= 0) {
            const iIsbn = database.perpustakaan.findIndex(pstk => pstk.isbn == request.body.isbn);
            if(iIsbn >= 0) {
                let result = {};
                if(iIsbn >= 0) result.kode = 'ISBN Sudah Terpakai! 😭';
                response.status(400).json({
                    info: 'Gagal Menambah Pustaka! 🤧 Data Sudah Ada! 😗',
                    result
                });
            }
            else AddNewDataToGoogleSheet('perpustakaan', 'perpustakaanDetail', request.body, response);
        }
        else {
            throw 'Harap Melakukan Login Ulang! 😯';
        }
    }
    catch (error) {
        response.status(401).json({
            info: 'Gagal Menambah Pustaka! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** Fasilitas -- Ruangan & Barang Perlengkapan */
app.get('/api/fasilitas/:kode', (request, response) => {
    if('kode' in request.params) {
        const parameter = request.params.kode.replace(/[^0-9a-zA-Z]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/fasilitas/${parameter}`);
            const index = database.fasilitas.findIndex(f => f.kode == parameter);
            if(index >= 0) {
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
    }
    ResponseJsonDataNotFound(response, 'Fasilitas Univ. Multimedia Nusantara 🤔', 'Fasilitas Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
});
app.get('/api/fasilitas', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/fasilitas`);
    const fasilitas = database.fasilitas;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    if(sortBy) {
        try {
            fasilitas.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
            if(orderBy == 'desc') {
                fasilitas.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
        }
        catch (err) {
            fasilitas.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
            if(orderBy == 'desc') {
                fasilitas.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
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
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if(index >= 0) {
            const iKode = database.fasilitas.findIndex(fs => fs.kode == request.body.kode);
            if(iKode >= 0) {
                let result = {};
                if(iKode >= 0) result.kode = 'Kode Sudah Terpakai! 😭';
                response.status(400).json({
                    info: 'Gagal Menambah Fasilitas! 🤧 Data Sudah Ada! 😗',
                    result
                });
            }
            else AddNewDataToGoogleSheet('fasilitas', 'fasilitasDetail', request.body, response);
        }
        else {
            throw 'Harap Melakukan Login Ulang! 😯';
        }
    }
    catch (error) {
        response.status(401).json({
            info: 'Gagal Menambah Fasilitas! 🤧 Akses Ditolak! 😷',
            result: error
        });
    }
});

/** Kantin -- Barang Dagangan */
app.get('/api/kantin/:kode', (request, response) => {
    if('kode' in request.params) {
        const parameter = request.params.kode.replace(/[^0-9a-zA-Z]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/kantin/${parameter}`);
            const index = database.kantin.findIndex(k => k.kode == parameter);
            if(index >= 0) {
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
    }
    ResponseJsonDataNotFound(response, 'Jajanan Univ. Multimedia Nusantara 🤔', 'Jajanan Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
});
app.get('/api/kantin', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/kantin`);
    const kantin = database.kantin;
    const sortBy = request.query['sort'];
    const orderBy = request.query['order'];
    if(sortBy) {
        try {
            kantin.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
            if(orderBy == 'desc') {
                kantin.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
        }
        catch (err) {
            kantin.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
            if(orderBy == 'desc') {
                kantin.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
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
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if(index >= 0) {
            const iKode = database.kantin.findIndex(kn => kn.kode == request.body.kode);
            if(iKode >= 0) {
                let result = {};
                if(iKode >= 0) result.kode = 'Kode Sudah Terpakai! 😭';
                response.status(400).json({
                    info: 'Gagal Menambah Kantin! 🤧 Data Sudah Ada! 😗',
                    result
                });
            }
            else AddNewDataToGoogleSheet('kantin', 'kantinDetail', request.body, response);
        }
        else {
            throw 'Harap Melakukan Login Ulang! 😯';
        }
    }
    catch (error) {
        response.status(401).json({
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

// Host Server On Current Network
const server = app.listen(port, host, () => {
    console.log(`Server Running :: ${server.address().address}:${server.address().port} 🤐`);
}).on('error', err => {
    console.log(`Server ${err.address}:${err.port} Already In Use 🤐`);
    const serverAlt = app.listen(0, host, () => {
        console.log(`Alternate Server Running :: ${serverAlt.address().address}:${serverAlt.address().port} 🤐`);
    });
});
module.exports = app;
