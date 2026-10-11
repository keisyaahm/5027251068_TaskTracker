(function () {
  let tugas = [
    { id: 1, judul: "Lab 10 event delegation", matkul: "Pemrograman Web", deadline: "2026-10-08", selesai: false },
    { id: 2, judul: "ERD sistem perpustakaan", matkul: "Basis Data", deadline: "2026-10-12", selesai: true }
  ];
  let filter = "semua";
  let nextId = 3;

  const form = document.querySelector("#form");
  const list = document.querySelector("#list");
  const err = document.querySelector("#err");
  const counter = document.querySelector("#counter");
  const filterContainer = document.querySelector("#filter");

  function render() {
    const data = tugas.filter(t => filter === "semua" || (filter === "aktif" ? !t.selesai : t.selesai));
    list.innerHTML = "";
    
    if (!data.length) {
      list.innerHTML = '<li class="kosong">Tidak ada tugas di sini 🎉</li>';
    }

    data.forEach(t => {
      const li = document.createElement("li");
      li.dataset.id = t.id;
      li.className = t.selesai ? "done" : "";
      
      li.innerHTML = `
        <input type="checkbox" class="cek">
        <div class="isi">
          <div class="judul"></div>
          <div class="meta"></div>
        </div>
        <button class="hapus">✕</button>
      `;
      
      li.querySelector(".cek").checked = t.selesai;
      li.querySelector(".judul").textContent = t.judul;
      li.querySelector(".meta").textContent = t.matkul + " · deadline " + t.deadline;
      
      list.append(li);
    });

    counter.textContent = tugas.filter(t => !t.selesai).length + " tugas aktif";
  }

  form.addEventListener("submit", e => {
    e.preventDefault();
    const judul = form.elements.judul.value.trim();
    const deadline = form.elements.deadline.value;

    if (judul.length < 3) {
      err.textContent = "Judul minimal 3 karakter.";
      return;
    }
    if (!deadline) {
      err.textContent = "Deadline wajib diisi.";
      return;
    }

    err.textContent = "";
    tugas.push({ 
      id: nextId++, 
      judul: judul, 
      matkul: form.elements.matkul.value, 
      deadline: deadline, 
      selesai: false 
    });
    
    form.reset();
    render();
  });

  list.addEventListener("click", e => {
    const li = e.target.closest("li[data-id]");
    if (!li) return;
    
    const id = Number(li.dataset.id);
    
    if (e.target.closest(".hapus")) {
      tugas = tugas.filter(t => t.id !== id);
    } else if (e.target.closest(".cek")) {
      tugas = tugas.map(t => t.id === id ? { ...t, selesai: !t.selesai } : t);
    } else {
      return;
    }
    
    render();
  });

  filterContainer.addEventListener("click", e => {
    const btn = e.target.closest("button");
    if (!btn) return;
    
    filter = btn.dataset.f;
    document.querySelectorAll("#filter button").forEach(x => {
      x.classList.toggle("on", x === btn);
    });
    
    render();
  });

  render();
})();