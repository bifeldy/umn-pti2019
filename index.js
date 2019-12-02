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

/** Heroku API */
let herokuKey;
try {
    herokuKey = require('./umn-pti2019-herokuKey.json');
}
catch(errorLoadCredential) {
    console.log(`Heroku Credential File Not Found! './umn-pti2019-herokuKey.json'`);
    console.log(`Using Alternate Config 'process.env.umn_pti2019_herokuKey'`);
    herokuKey = JSON.parse(process.env.umn_pti2019_herokuKey);
}

/** Google Sheet API */
const { google } = require('googleapis');

var googleApiKey, googleClient, gsApi;
try {
    googleApiKey = require('./umn-pti2019-googleKey.json');
}
catch(errorLoadCredential) {
    console.log(`Google Credential File Not Found! './umn-pti2019-googleKey.json'`);
    console.log(`Using Alternate Config 'process.env.umn_pti2019_googleKey'`);
    googleApiKey = JSON.parse(process.env.umn_pti2019_googleKey);
}
function InitializeGoogleAPI() {
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
        for (let index=0; index<database[workSheetTabName].length; index++) {
            // Object.keys(database[workSheetTabName][index]).forEach(key => {
            //     if (!isNaN(database[workSheetTabName][index][key])) {
            //         if (key == 'telepon' || key == 'id_kode_nim_isbn_favorited') continue;
            //         database[workSheetTabName][index][key] = parseInt(database[workSheetTabName][index][key]);
            //     }
            // });
            if ('id' in database[workSheetTabName][index]) database[workSheetTabName][index].id = parseInt(database[workSheetTabName][index].id);
            if ('harga' in database[workSheetTabName][index]) database[workSheetTabName][index].harga = parseInt(database[workSheetTabName][index].harga);
            if ('isbn' in database[workSheetTabName][index]) database[workSheetTabName][index].isbn = parseInt(database[workSheetTabName][index].isbn);
            if ('anggota' in database[workSheetTabName][index]) database[workSheetTabName][index].anggota = parseInt(database[workSheetTabName][index].anggota);
            if ('nim' in database[workSheetTabName][index]) database[workSheetTabName][index].nim = parseInt(database[workSheetTabName][index].nim);
            if ('angkatan' in database[workSheetTabName][index]) database[workSheetTabName][index].angkatan = parseInt(database[workSheetTabName][index].angkatan);
            // if ('deleted' in database[workSheetTabName][index]) database[workSheetTabName][index].deleted = (database[workSheetTabName][index].deleted == 'TRUE');
            if ('created_at' in database[workSheetTabName][index]) database[workSheetTabName][index].created_at = parseInt(database[workSheetTabName][index].created_at);
            if ('updated_at' in database[workSheetTabName][index]) database[workSheetTabName][index].updated_at = parseInt(database[workSheetTabName][index].updated_at);
        }
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
async function AddNewDataToGoogleSheet(object, objectDetail, requestBody, resp, startColumn = 1, endColumnBefore = 2) {
    GenerateNewSessionToGoogleAPI();
    const currentTime = new Date().getTime();
    let newObject = {};
    const tempKey = await LoadGoogleSheetData(object);
    for(let i=startColumn; i<tempKey.length-endColumnBefore; i++) {
        if (
            requestBody[tempKey[i]] == undefined ||
            requestBody[tempKey[i]] == null ||
            requestBody[tempKey[i]] == ''
        ) {
            return resp.status(400).json({
                info: 'Gagal Menambahkan Data! 🤤',
                message: 'Data Utama Tidak Lengkap! 😦'
            });
        }
    }
    tempKey.forEach(key => {
        newObject[key] = requestBody[key];
    });
    if(startColumn == 1) newObject.id = database[object].length + 1;
    newObject.created_at = currentTime;
    newObject.updated_at = currentTime;
    if(objectDetail != null) {
        let newObjectDetail = {};
        const tempKeyDetail = await LoadGoogleSheetData(objectDetail);
        for(let i=startColumn; i<tempKeyDetail.length-endColumnBefore; i++) {
            if (
                requestBody[tempKeyDetail[i]] == undefined ||
                requestBody[tempKeyDetail[i]] == null ||
                requestBody[tempKeyDetail[i]] == ''
            ) {
                return resp.status(400).json({
                    info: 'Gagal Menambahkan Data! 🤤',
                    message: 'Data Detail Tidak Lengkap! 😦'
                });
            }
        }
        tempKeyDetail.forEach(key => {
            newObjectDetail[key] = requestBody[key];
        });
        if(startColumn == 1) newObjectDetail.id = database[objectDetail].length + 1;
        newObjectDetail.created_at = currentTime;
        newObjectDetail.updated_at = currentTime;
    }
    await WriteAppendGoogleSheetData(object, {...newObject});
    if ('deleted' in newObject) delete newObject.deleted;
    if(objectDetail != null) await WriteAppendGoogleSheetData(objectDetail, {...newObjectDetail});
    await RefreshGoogleSheetData();
    resp.status(201).json({
        info: 'Berhasil Menambahkan Data! ^_^.~ 😁',
        result: (objectDetail != null ? {...newObject, ...newObjectDetail} : {...newObject})
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
// app.get('/', (request, response) => {
//     console.log(`${request.connection.remoteAddress} => /`);
//     response.sendfile('./Information.png');
// });

app.get('/api/logs', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /logs`);
    externalRequest({
        method: 'POST',
        url: `https://api.heroku.com/apps/${herokuKey.appId}/log-sessions`,
        headers: {
            'Authorization': `Bearer ${herokuKey.appToken}`,
            'Accept': 'application/vnd.heroku+json; version=3'
        },
        form: {
            "lines": 10,
            "tail": true
        }
    },
    (err, res, body) => {
        if(!err && res.statusCode == 201) {
            const loggingUrl = JSON.parse(body).logplex_url;
            console.log(`New Logging Url => ${loggingUrl}`);
            response.redirect(loggingUrl);
        }
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
        'user_name' in newUserData &&
        'telepon' in newUserData &&
        'email' in newUserData &&
        'nama_lengkap' in newUserData &&
        'alamat' in newUserData &&
        'tanggal_lahir' in newUserData &&
        'password' in newUserData
    ) {
        newUserData.user_name = newUserData.user_name.replace(/[^0-9a-zA-Z]+/g, '');
        newUserData.telepon = newUserData.telepon.replace(/[^0-9]+/g, '');
        newUserData.email = newUserData.email.replace(/[^0-9a-zA-Z@.]+/g, '');
        newUserData.nama_lengkap = newUserData.nama_lengkap.replace(/[^a-zA-Z\s]+/g, '');
        newUserData.alamat = newUserData.alamat.replace(/[^0-9a-zA-Z.,\s]+/g, '');
        newUserData.tanggal_lahir = newUserData.tanggal_lahir.replace(/[^0-9-]+/g, '');
        if (
            newUserData.user_name != null &&  newUserData.user_name != '' &&  newUserData.user_name != undefined &&
            newUserData.telepon != null &&  newUserData.telepon != '' &&  newUserData.telepon != undefined &&
            newUserData.email != null &&  newUserData.email != '' &&  newUserData.email != undefined &&
            newUserData.nama_lengkap != null &&  newUserData.nama_lengkap != '' &&  newUserData.nama_lengkap != undefined &&
            newUserData.alamat != null &&  newUserData.alamat != '' &&  newUserData.alamat != undefined &&
            newUserData.tanggal_lahir != null &&  newUserData.tanggal_lahir != '' &&  newUserData.tanggal_lahir != undefined &&
            newUserData.password != null &&  newUserData.password != '' &&  newUserData.password != undefined
        ) {
            if(newUserData.telepon != '' && newUserData.user_name != '' && new Date(newUserData.tanggal_lahir) < new Date()) {
                if ((Date.now() - new Date(newUserData.tanggal_lahir)) / (31557600000) < 13) {
                    response.status(400).json({
                        info: 'Gagal Mendaftarkan User Baru! T_T 😪',
                        message: `Kamu Masih Berada Dibawah Umur! 🤔`
                    });
                    return;
                }
                const iUserName = database.users.findIndex(u => u.user_name == newUserData.user_name.toLowerCase());
                const iPhone = database.users.findIndex(u => u.telepon == newUserData.telepon);
                const iEmail = database.users.findIndex(u => u.email == newUserData.email.toLowerCase());
                const index = Math.max(iUserName, iEmail, iPhone);
                if(index >= 0) {
                    const result = {};
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
                    if(
                        !('foto' in newUserData) ||
                        newUserData.foto == '' ||
                        newUserData.foto == null ||
                        newUserData.foto == undefined
                    ) {
                        newUserData.foto = 'https://via.placeholder.com/966x935';
                    }
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
                        message: 'Harap Mengirimkan Password Yang Sudah Di Hash Dengan SHA512! 🙄'
                    });
                }
                return;
            }
        }
    }
    response.status(400).json({
        info: 'Gagal Mendaftarkan User Baru! T_T 😒',
        message: 'Data Pendaftar Tidak Lengkap / Valid! 😦'
    });
});

/** User Profile */
app.post('/api/update', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/update => ${JSON.stringify(request.body)}`);
    try {
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const index = database.users.findIndex(u => u.id == decoded.user.id);
        if(index >= 0) {
            if (
                !('nama_lengkap' in request.body) && !('alamat' in request.body) &&
                !('tanggal_lahir' in request.body) && !('foto' in request.body) &&
                !('password' in request.body)
            ) {
                response.json({
                    info: 'Tidak Ada Data Profil Yang Dapat Diubah! 😝',
                    message: 'Hemn .. Menarik .. 🤯'
                });
            }
            else {
                const currentTime = new Date().getTime();
                const updateUser = {...database.users[index]};
                const error = {};
                if('password' in request.body) {
                    if(request.body.password.length >= 128) {
                        updateUser.password = request.body.password;
                    }
                    else error.password = 'Harap Mengirimkan Password Yang Sudah Di Hash Dengan SHA512! 🙄';
                }
                if('tanggal_lahir' in request.body) {
                    if (new Date(request.body.tanggal_lahir) < new Date()) {
                        if ((Date.now() - new Date(request.body.tanggal_lahir)) / (31557600000) < 13) {
                            error.tanggal_lahir = 'Minimal Umur 13++ Tahun! 🤔';
                        }
                        else updateUser.tanggal_lahir = request.body.tanggal_lahir;
                    }
                    else error.tanggal_lahir = 'Tanggal Lahir Tidak Valid! 😦';
                }
                if('nama_lengkap' in request.body) {
                    if (request.body.nama_lengkap.replace(/[^a-zA-Z\s]+/g, '') == '') {
                        error.nama_lengkap = 'Nama Lengkap Tidak Valid! 😦';
                    }
                    else updateUser.nama_lengkap = request.body.nama_lengkap.replace(/[^a-zA-Z\s]+/g, '');
                }
                if('alamat' in request.body) {
                    if (request.body.alamat.replace(/[^0-9a-zA-Z.,\/\s]+/g, '') == '') {
                        error.alamat = 'Alamat Tidak Valid! 😦';
                    }
                    else updateUser.alamat = request.body.alamat.replace(/[^0-9a-zA-Z.,\/\s]+/g, '');
                }
                if('foto' in request.body) updateUser.foto = request.body.foto;
                updateUser.updated_at = currentTime;
                if(Object.keys(error).length > 0) throw error;
                WriteUpdateGoogleSheetData('users', {...updateUser});
                response.status(201).json({
                    info: 'Berhasil Memperbaharui Data Profil! 😝',
                    token: JwtEncode(updateUser)
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
app.post('/api/add-favorites', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/add-favorites => ${JSON.stringify(request.body)}`);
    try {
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const userIndex = database.users.findIndex(u => u.id == decoded.user.id);
        if(userIndex >= 0) {
            const iFav = database.userFavorites.findIndex(fav => (
                fav.user_name == database.users[userIndex].user_name &&
                fav.type == request.body.type &&
                fav.id_kode_nim_isbn_favorited == request.body.id_kode_nim_isbn_favorited &&
                fav.deleted == 'FALSE'
            ));
            if(iFav >= 0) {
                response.status(400).json({
                    info: 'Gagal Menambah Favorite! 🤧 Data Sudah Ada! 😗',
                    message: `Data ${request.body.type} Dengan Kode Nomor Id ${request.body.id_kode_nim_isbn_favorited} Sudah Menjadi Favorit ${database.users[userIndex].user_name} 😪`
                });
                return;
            }
            if (request.body.type in database) {
                const typeIdx = database[request.body.type].findIndex(i => (
                    i.kode == request.body.id_kode_nim_isbn_favorited ||
                    i.isbn == request.body.id_kode_nim_isbn_favorited ||
                    i.nim == request.body.id_kode_nim_isbn_favorited
                ));
                if (typeIdx >= 0) {
                    const newFav = {...request.body};
                    newFav.user_name = database.users[userIndex].user_name;
                    newFav.deleted = 'FALSE';
                    AddNewDataToGoogleSheet('userFavorites', null, newFav, response, 1);
                    return;
                }
                else {
                    response.status(400).json({
                        info: 'Gagal Menambah Favorite! 🤧 Kode Nomor Id Tidak Sesuai! 😗',
                        message: `Data ${request.body.id_kode_nim_isbn_favorited} Tidak Ada Dalam ${request.body.type} 😪`
                    });
                    return;
                }
            }
            else {
                response.status(400).json({
                    info: 'Gagal Menambah Favorite! 🤧 Type Tidak Sesuai! 😗',
                    message: `Data Type ${request.body.type} Tidak Ada 😪`
                });
                return;
            }
        }
        else {
            throw 'Akses Ditolak! 😯';
        }
    }
    catch (e) {
        response.status(401).json({
            info: 'Whoops! Terjadi Kesalahan 🤔',
            result: e
        });
    }
});
app.delete('/api/delete-favorites', (request, response) => {
    console.log(`${request.connection.remoteAddress} => /api/user/delete-favorites => ${JSON.stringify(request.body)}`);
    try {
        let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
        if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
        const decoded = jwt.verify(token, jwtSecretKey);
        const userIndex = database.users.findIndex(u => u.id == decoded.user.id);
        if(userIndex >= 0) {
            const iFav = database.userFavorites.findIndex(fav => (
                fav.user_name == database.users[userIndex].user_name &&
                fav.type == request.body.type &&
                fav.id_kode_nim_isbn_favorited == request.body.id_kode_nim_isbn_favorited &&
                fav.deleted == 'FALSE'
            ));
            if(iFav >= 0) {
                database.userFavorites[iFav].deleted = 'TRUE';
                database.userFavorites[iFav].updated_at = new Date().getTime();
                WriteUpdateGoogleSheetData('userFavorites', {...database.userFavorites[iFav]});
                response.json({
                    info: 'Berhasil Menghapus Favorite! 😝',
                    token: `Data ${request.body.type} Dengan Kode Nomor Id ${request.body.id_kode_nim_isbn_favorited} Behasil Di Hapus Dari Favorite 🤔`
                });
                return;
            }
            else {
                response.status(400).json({
                    info: 'Gagal Menambah Favorite! 🤧 Data Tidak Ada! 😗',
                    message: `Data ${request.body.type} Dengan Kode Nomor Id ${request.body.id_kode_nim_isbn_favorited} Belum Menjadi Favorit ${database.users[userIndex].user_name} 😪`
                });
                return;
            }
        }
        else {
            throw 'Akses Ditolak! 😯';
        }
    }
    catch (e) {
        response.status(401).json({
            info: 'Whoops! Terjadi Kesalahan 🤔',
            result: e
        });
        return;
    }
});
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
app.get('/api/user/:user_name/favorites', (request, response) => {
    if('user_name' in request.params) {
        const parameter = request.params.user_name.replace(/[^0-9a-zA-Z]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/user/${parameter}/favorites`);
            const index = database.users.findIndex(u => u.user_name == parameter.toLowerCase());
            if(index >= 0) {
                let tempFavorites = database.userFavorites.filter(fav => (fav.user_name == database.users[index].user_name && fav.deleted == 'FALSE'));
                let favorites = [];
                for (let i=0; i<tempFavorites.length; i++) {
                    const temp = {...tempFavorites[i]};
                    delete temp.deleted;
                    favorites.push(temp);
                }
                const typeBy = request.query['type'];
                if(typeBy) {
                    favorites = favorites.filter(fv => fv.type == typeBy);
                    const sortBy = request.query['sort'];
                    const orderBy = request.query['order'];
                    if(sortBy) {
                        try {
                            if(orderBy == 'desc') {
                                favorites.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
                            }
                            else favorites.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
                        }
                        catch (err) {
                            if(orderBy == 'desc') {
                                favorites.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
                            }
                            else favorites.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
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

/** Searching -- Dropped! */
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
            if(orderBy == 'desc') {
                mahasiswa.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
            else mahasiswa.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
        }
        catch (err) {
            if(orderBy == 'desc') {
                mahasiswa.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
            }
            else mahasiswa.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
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
            else {
                if('tanggal_lahir' in request.body) {
                    if (new Date(request.body.tanggal_lahir) < new Date()) {
                        if ((Date.now() - new Date(request.body.tanggal_lahir)) / (31557600000) < 15) {
                            response.status(400).json({
                                info: 'Gagal Menambah Data Mahasiswa! T_T 😪',
                                message: `Minimal Umur 15++ Tahun! 🤔`
                            });
                            return;
                        }
                    }
                    else {
                        response.status(400).json({
                            info: 'Gagal Menambah Data Mahasiswa! T_T 😒',
                            message: 'Tanggal Lahir Tidak Valid! 😦'
                        });
                        return;
                    }
                }
                AddNewDataToGoogleSheet('mahasiswa', 'mahasiswaDetail', request.body, response);
            }
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
app.put('/api/mahasiswa/:nim', (request, response) => {
    if('nim' in request.params) {
        const parameter = request.params.nim.replace(/[^0-9]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/mahasiswa/${parameter} => ${JSON.stringify(request.body)}`);
            const idxMahasiswa = database.mahasiswa.findIndex(u => u.nim == parseInt(parameter));
            if(idxMahasiswa >= 0) {
                try {
                    let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
                    if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
                    const decoded = jwt.verify(token, jwtSecretKey);
                    const idx = database.users.findIndex(u => u.id == decoded.user.id);
                    if(idx >= 0) {
                        if (
                            !('nama_lengkap' in request.body) && !('telepon' in request.body) &&
                            !('foto' in request.body) && !('alamat' in request.body) &&
                            !('prodi' in request.body) && !('tanggal_lahir' in request.body) && !('angkatan' in request.body)
                        ) {
                            response.json({
                                info: 'Tidak Ada Data Mahasiswa Yang Dapat Diubah! 😝',
                                message: 'Hemn .. Menarik .. 🤯'
                            });
                        }
                        else {
                            const currentTime = new Date().getTime();
                            const updateMahasiswa = {...database.mahasiswa[idxMahasiswa]};
                            const updateMahasiswaDetail = {...database.mahasiswaDetail[idxMahasiswa]};
                            const error = {};
                            if('nama_lengkap' in request.body) {
                                const newNamaLengkap = request.body.nama_lengkap.replace(/[^a-zA-Z\s]+/g, '');
                                if (newNamaLengkap == '') error.nama_lengkap = 'Nama Tidak Valid! 😦';
                                else updateMahasiswa.nama_lengkap = newNamaLengkap;
                            }
                            if('telepon' in request.body) {
                                const newTelepon = request.body.telepon.replace(/[^0-9]+/g, '')
                                if (newTelepon == '') error.telepon = 'Jumlah Tidak Valid! 😦';
                                else updateMahasiswaDetail.telepon = newTelepon;
                            }
                            if('foto' in request.body) updateMahasiswa.foto = request.body.foto;
                            if('alamat' in request.body) {
                                const newAlamat = request.body.alamat.replace(/[^0-9a-zA-Z.,\/\s]+/g, '');
                                if (newAlamat == '') error.alamat = 'Alamat Tidak Valid! 😦';
                                else updateMahasiswaDetail.alamat = newAlamat;
                            }
                            if('prodi' in request.body) {
                                const newProdi = request.body.prodi.replace(/[^a-zA-Z\s]+/g, '');
                                if (newProdi == '') error.prodi = 'Prodi Tidak Valid! 😦';
                                else updateMahasiswaDetail.prodi = newProdi;
                            }
                            if('angkatan' in request.body) {
                                const newAngkatan = request.body.angkatan.replace(/[^0-9]+/g, '')
                                if (newAngkatan == '') error.angkatan = 'Angkatan Tidak Valid! 😦';
                                else updateMahasiswaDetail.angkatan = newAngkatan;
                            }
                            if('tanggal_lahir' in request.body) {
                                if (new Date(request.body.tanggal_lahir) < new Date()) {
                                    if ((Date.now() - new Date(request.body.tanggal_lahir)) / (31557600000) < 15) {
                                        error.tanggal_lahir = 'Minimal Umur 15++ Tahun! 🤔';
                                    }
                                    else updateMahasiswaDetail.tanggal_lahir = request.body.tanggal_lahir;
                                }
                                else error.tanggal_lahir = 'Tanggal Lahir Tidak Valid! 😦';
                            }
                            updateMahasiswa.updated_at = currentTime;
                            updateMahasiswaDetail.updated_at = currentTime;
                            if(Object.keys(error).length > 0) throw error;
                            WriteUpdateGoogleSheetData('mahasiswa', {...updateMahasiswa});
                            WriteUpdateGoogleSheetData('mahasiswaDetail', {...updateMahasiswaDetail});
                            response.status(201).json({
                                info: 'Berhasil Memperbaharui Data Mahasiswa! 😝',
                                result: {...updateMahasiswa, ...updateMahasiswaDetail}
                            });
                        }
                    }
                    else {
                        throw 'Harap Melakukan Login Ulang! 😯';
                    }
                }
                catch (error) {
                    response.status(401).json({
                        info: 'Gagal Memperbaharui Data Mahasiswa Mahasiswa! 🤧 Akses Ditolak! 😷',
                        result: error
                    });
                }
                return;
            }
        }
    }
    ResponseJsonDataNotFound(response, 'Mahasiswa Univ. Multimedia Nusantara 🤔', 'Mahasiswa Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
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
            if(orderBy == 'desc') {
                ukm.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
            else ukm.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
        }
        catch (err) {
            if(orderBy == 'desc') {
                ukm.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
            }
            else ukm.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
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
app.put('/api/ukm/:kode', (request, response) => {
    if('kode' in request.params) {
        const parameter = request.params.kode.replace(/[^0-9a-zA-Z]+/g, '');
        if(parameter != '') {
            console.log(`${request.connection.remoteAddress} => /api/ukm/${parameter} => ${JSON.stringify(request.body)}`);
            const idxUkm = database.ukm.findIndex(u => u.kode == parameter);
            if(idxUkm >= 0) {
                try {
                    let token = request.headers['x-access-token'] || request.headers['authorization'] || request.body.token;
                    if(token.startsWith('Bearer ')) token = token.slice(7, token.length);
                    const decoded = jwt.verify(token, jwtSecretKey);
                    const idx = database.users.findIndex(u => u.id == decoded.user.id);
                    if(idx >= 0) {
                        if (
                            !('nama' in request.body) && !('anggota' in request.body) &&
                            !('foto' in request.body) && !('deskripsi' in request.body) &&
                            !('jam_mulai' in request.body) && !('jam_selesai' in request.body)
                        ) {
                            response.json({
                                info: 'Tidak Ada Data Ukm Yang Dapat Diubah! 😝',
                                message: 'Hemn .. Menarik .. 🤯'
                            });
                        }
                        else {
                            const currentTime = new Date().getTime();
                            const updateUkm = {...database.ukm[idxUkm]};
                            const updateUkmDetail = {...database.ukmDetail[idxUkm]};
                            const error = {};
                            if('nama' in request.body) {
                                const newNama = request.body.nama.replace(/[^a-zA-Z\s]+/g, '');
                                if (newNama == '') error.nama = 'Nama Tidak Valid! 😦';
                                else updateUkm.nama = newNama;
                            }
                            if('anggota' in request.body) {
                                const newAnggota = request.body.anggota.replace(/[^0-9]+/g, '')
                                if (newAnggota == '') error.anggota = 'Jumlah Tidak Valid! 😦';
                                else updateUkm.anggota = newAnggota;
                            }
                            if('foto' in request.body) updateUkm.foto = request.body.foto;
                            if('deskripsi' in request.body) {
                                const newDeskripsi = request.body.deskripsi.replace(/[^0-9a-zA-Z.,!@#$%^&*()\-+_=?`~\/\'\"\s]+/g, '');
                                if (newDeskripsi == '') error.deskripsi = 'Deskripsi Tidak Valid! 😦';
                                else updateUkm.deskripsi = newDeskripsi;
                            }
                            if('jam_mulai' in request.body) {
                                const newJamMulai = request.body.jam_mulai.replace(/[^0-9:]+/g, '')
                                if (newJamMulai == '') error.jam_mulai = 'Jam Mulai Tidak Valid! 😦';
                                else updateUkmDetail.jam_mulai = newJamMulai;
                            }
                            if('jam_selesai' in request.body) {
                                const newJamSelesai = request.body.jam_selesai.replace(/[^0-9:]+/g, '')
                                if (newJamSelesai == '') error.jam_selesai = 'Jam Selesai Tidak Valid! 😦';
                                else updateUkmDetail.jam_selesai = newJamSelesai;
                            }
                            updateUkm.updated_at = currentTime;
                            updateUkmDetail.updated_at = currentTime;
                            if(Object.keys(error).length > 0) throw error;
                            WriteUpdateGoogleSheetData('ukm', {...updateUkm});
                            WriteUpdateGoogleSheetData('ukmDetail', {...updateUkmDetail});
                            response.status(201).json({
                                info: 'Berhasil Memperbaharui Data UKM! 😝',
                                result: {...updateUkm, ...updateUkmDetail}
                            });
                        }
                    }
                    else {
                        throw 'Harap Melakukan Login Ulang! 😯';
                    }
                }
                catch (error) {
                    response.status(401).json({
                        info: 'Gagal Memperbaharui Ekstrakurikuler Mahasiswa! 🤧 Akses Ditolak! 😷',
                        result: error
                    });
                }
                return;
            }
        }
    }
    ResponseJsonDataNotFound(response, 'Ekstrakurikuler Mahasiswa Univ. Multimedia Nusantara 🤔', 'Ekstrakurikuler Mahasiswa Yang Anda Cari Tidak Dapat Ditemukan~ 😏');
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
            if(orderBy == 'desc') {
                perpustakaan.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
            else perpustakaan.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
        }
        catch (err) {
            if(orderBy == 'desc') {
                perpustakaan.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
            }
            else perpustakaan.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
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
            if(orderBy == 'desc') {
                fasilitas.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
            else fasilitas.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
        }
        catch (err) {
            if(orderBy == 'desc') {
                fasilitas.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
            }
            else fasilitas.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
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
            if(orderBy == 'desc') {
                kantin.sort((a, b) => (JSON.parse(a[sortBy]) < JSON.parse(b[sortBy])) ? 1 : -1);
            }
            else kantin.sort((a, b) => (JSON.parse(a[sortBy]) > JSON.parse(b[sortBy])) ? 1 : -1);
        }
        catch (err) {
            if(orderBy == 'desc') {
                kantin.sort((a, b) => (a[sortBy] < b[sortBy]) ? 1 : -1);
            }
            else kantin.sort((a, b) => (a[sortBy] > b[sortBy]) ? 1 : -1);
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
