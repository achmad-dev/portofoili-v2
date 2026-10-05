# Eh belajar docker bentaran yuk

![Image](https://cdn-images-1.medium.com/max/1024/0*bcRsp52IF7GOnWG2)

Pernah kepikiran ga sih, kenapa Docker sekarang jadi *lingua franca* buat infrastructure? Semenjak kemunculannya, Docker sukses mengubah banyak hal di dunia development. Tapi tau ga? Ternyata di baliknya itu ada *tools* Linux yang sebenernya udah ada sejak lama, loh! Yuk, kita pelajarin bareng-bareng.

**Pertama, apa sih itu Docker?** Gampangnya, Docker itu alat *containerization*. Bayangin dia kayak satu kotak wadah yang menampung aplikasi kita lengkap sama segala macem *dependency* yang dibutuhin. Hasilnya? Aplikasi kita bisa jalan mulus di berbagai macem OS. Jadi, *bye-bye* drama ‘it works on my machine’

**Apa sih yang sebenernya ada di balik Docker?** Ternyata, dia berdiri di atas 3 *tools* Linux yang jadi pondasi utamanya. Apa aja sih itu? Yuk bedah satu-satu.

**1. Namespaces (Fitur Isolasi “Pandangan”)** Ini fitur Linux yang udah ada sejak tahun 2002. Tugas utamanya bikin sebuah proses merasa “sendirian” di dalam sistem.

Cara kerjanya gini: Saat kamu masuk ke container, kamu merasa punya PID 1 (*Process ID* 1), punya network sendiri, dan user sendiri. Padahal aslinya di server (*host*), kamu cuma proses kecil biasa dengan ID acak, misal 12345.

*Bayangin kayak kamu pake ****kacamata kuda****. Kamu ada di tengah keramaian (server), tapi kamu cuma bisa lihat apa yang ada di depan mata kamu (container), ga bisa lihat orang lain di sebelah kamu.*

**2. Cgroups / Control Groups (Fitur Isolasi “Jatah”)** Kalau yang ini fitur buatan Google (sekitar tahun 2006) yang kemudian dimasukin ke Kernel Linux.

Cgroups tugasnya membatasi penggunaan *resource*. Docker pake ini buat bilang: “Eh, Container A cuma boleh pake RAM 512MB dan CPU 1 Core ya.” Tanpa Cgroups, satu container bisa rakus makan semua RAM dan bikin server *hang*.

*Bayangin kayak ****jatah makan siang****. Walaupun menunya prasmanan (server resource gede), kamu dikasih piring kecil (Cgroups) jadi ga bisa ambil semua lauk seenaknya.*

**3. Union File System / OverlayFS (Sistem Layer)** Nah, ini nih yang bikin Docker ringan banget karena dia punya sistem *Layer*.

Bedanya sama VM biasa: kalau di VM kamu copy file 1GB, harddisk berkurang 1GB. Kalau di Docker, dia pake sistem tumpuk (*layer*). Misal kamu punya base image Ubuntu (*Layer 1*), terus install Python (*Layer 2*), Docker ga menduplikasi Ubuntunya. Dia cuma nambahin lapisan tipis “Python” di atasnya.

*Bayangin kayak ****kertas mika transparan**** yang ditumpuk. Gambar dasarnya sama, kamu cuma nambahin coretan di kertas mika baru di atasnya tanpa merusak gambar asli di bawahnya.*

---

Published 2025-12-23 · [Read on medium](https://medium.com/@moonNight1/eh-belajar-docker-bentaran-yuk-b4b706f41b6f?source=rss-86218010e568------2)
