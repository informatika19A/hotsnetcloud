'use strict';
/* Halaman hasil siswa: pilih kelas -> nama -> NIS/No. Absen -> lihat nilai + skor per soal */
(function () {
  var API = window.HOTS_API_URL;
  var $ = function (id) { return document.getElementById(id); };
  var req = 0;

  function api(action, data) {
    if (!API || API.indexOf('PASTE_') === 0) return Promise.reject(new Error('Alamat server belum diatur. Guru perlu mengisi config.js.'));
    var ctl = new AbortController();
    var t = setTimeout(function () { ctl.abort(); }, 25000);
    return fetch(API, {
      method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(Object.assign({ action: action }, data || {})), signal: ctl.signal
    }).then(function (r) { return r.json(); }).then(function (j) {
      clearTimeout(t);
      if (!j || j.ok === false) throw new Error((j && j.error) || 'Terjadi kesalahan di server.');
      return j;
    }, function (e) {
      clearTimeout(t);
      throw new Error(e && e.name === 'AbortError' ? 'Koneksi terlalu lama. Periksa internet.' : 'Tidak bisa terhubung ke server. Periksa internet.');
    });
  }

  function resetNama(teks) {
    var n = $('nama'); n.innerHTML = ''; n.disabled = true;
    var o = document.createElement('option'); o.value = ''; o.textContent = teks; n.appendChild(o);
  }

  $('kelas').addEventListener('change', function () {
    var kelas = this.value, id = ++req;
    $('err').textContent = '';
    if (!kelas) { resetNama('Pilih kelas terlebih dahulu'); return; }
    resetNama('Memuat daftar nama...');
    api('siswa', { kelas: kelas }).then(function (r) {
      if (id !== req) return;
      var n = $('nama'); n.innerHTML = '';
      var o = document.createElement('option'); o.value = ''; o.textContent = 'Pilih namamu'; n.appendChild(o);
      r.siswa.forEach(function (s) {
        var x = document.createElement('option'); x.value = s.nama; x.textContent = s.nama; n.appendChild(x);
      });
      n.disabled = false;
    }).catch(function (e) {
      if (id !== req) return;
      resetNama('Gagal memuat. Pilih kelas lagi'); $('err').textContent = e.message;
    });
  });

  function predikat(n) {
    if (n >= 92) return ['ok', 'Sangat baik'];
    if (n >= 87) return ['ok', 'Baik'];
    if (n >= 82) return ['warn', 'Cukup'];
    return ['bad', 'Kurang'];
  }

  $('form-hasil').addEventListener('submit', function (ev) {
    ev.preventDefault();
    var err = $('err'); err.textContent = '';
    var kelas = $('kelas').value, nama = $('nama').value, pin = $('pin').value.replace(/\s+/g, '');
    if (!kelas) { err.textContent = 'Pilih kelas.'; return; }
    if (!nama) { err.textContent = 'Pilih namamu dari daftar.'; return; }
    if (!/^\d{4,8}$/.test(pin)) { err.textContent = 'Isi PIN dari gurumu (angka).'; return; }
    var btn = $('btn-lihat'); btn.disabled = true; btn.textContent = 'Memeriksa...';
    api('hasilSiswa', { kelas: kelas, nama: nama, pin: pin }).then(tampil).catch(function (e) {
      err.textContent = e.message;
    }).then(function () { btn.disabled = false; btn.textContent = 'Lihat Hasil'; });
  });

  function tampil(r) {
    $('h-info').textContent = 'Kelas ' + r.kelas;
    $('h-nama').textContent = r.nama;
    $('h-nilai').textContent = r.nilai;
    var p = predikat(r.nilai); $('h-pred').className = 'pill ' + p[0]; $('h-pred').textContent = p[1];
    $('h-maks').textContent = r.skorMaks;
    $('h-bars').innerHTML = '';
    r.soal.forEach(function (q, i) {
      var sk = Number(r.skor[i]) || 0, row = document.createElement('div');
      row.className = 'bar-row';
      var a = document.createElement('span'); a.textContent = 'Soal ' + q.no; a.title = q.bagian + ' (' + q.level + ')';
      var bar = document.createElement('div'); bar.className = 'bar';
      var fill = document.createElement('i'); fill.style.width = Math.max(0, Math.min(100, sk / r.skorMaks * 100)) + '%';
      bar.appendChild(fill);
      var v = document.createElement('span'); v.textContent = sk + ' / ' + r.skorMaks;
      row.appendChild(a); row.appendChild(bar); row.appendChild(v);
      $('h-bars').appendChild(row);
    });
    $('form-hasil').classList.add('hidden'); $('hasil').classList.remove('hidden');
    window.scrollTo(0, 0);
  }

  $('btn-lagi').addEventListener('click', function () {
    $('pin').value = ''; $('hasil').classList.add('hidden'); $('form-hasil').classList.remove('hidden');
  });

  /* judul dari pengaturan guru */
  if (API && API.indexOf('PASTE_') !== 0) {
    api('status').then(function (r) { if (r.judul) $('judul').textContent = 'Hasil: ' + r.judul; }).catch(function () {});
  } else {
    $('err').textContent = 'Alamat server belum diatur. Guru perlu mengisi config.js.';
  }
})();
