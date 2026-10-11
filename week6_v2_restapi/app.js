(function () {
  const state = {
    status: "loading",
    tugas: [],
    matkul: [],
    error: "",
    notice: "",
    filter: "semua",
    processing: new Set(),
    saving: false
  };

  const form = document.querySelector("#form");
  const list = document.querySelector("#list");
  const info = document.querySelector("#info");
  const counter = document.querySelector("#counter");
  const error = document.querySelector("#err");
  const submitButton = document.querySelector("#simpan");
  const filterBar = document.querySelector("#filter");
  let loadVersion = 0;

  async function api(url, options = {}) {
    const init = { method: options.method || "GET" };

    if (options.body !== undefined) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(options.body);
    }

    const response = await fetch(url, init);
    let body = null;

    if (response.status !== 204) {
      try {
        body = await response.json();
      } catch (parseError) {
        if (response.ok) {
          throw new Error("Respons server bukan JSON yang valid.");
        }
      }
    }

    if (!response.ok) {
      throw new Error(body && body.error ? body.error : "HTTP " + response.status);
    }

    return body;
  }

  function render() {
    const activeCount = state.tugas.filter(task => !task.selesai).length;
    counter.textContent = state.status === "success" ? activeCount + " tugas aktif" : "";
    list.replaceChildren();
    info.className = "info";
    info.textContent = "";
    submitButton.disabled = state.saving || state.status !== "success";
    submitButton.textContent = state.saving ? "Menyimpan…" : "Tambah";

    if (state.status === "loading") {
      info.textContent = "⏳ Memuat tugas dari server…";
      for (let index = 0; index < 3; index += 1) {
        const skeleton = document.createElement("li");
        skeleton.className = "skel";
        skeleton.setAttribute("aria-hidden", "true");
        list.append(skeleton);
      }
      return;
    }

    if (state.status === "error") {
      info.classList.add("err2");
      info.append("Gagal memuat: " + state.error + " ");

      const retryButton = document.createElement("button");
      retryButton.id = "ulang";
      retryButton.type = "button";
      retryButton.textContent = "↻ Coba lagi";
      info.append(retryButton);
      return;
    }

    if (state.notice) {
      info.classList.add("err2");
      info.textContent = state.notice;
    }

    const tasks = state.tugas
      .filter(task => (
        state.filter === "semua" ||
        (state.filter === "aktif" ? !task.selesai : task.selesai)
      ))
      .slice()
      .sort((first, second) => first.deadline.localeCompare(second.deadline));

    if (tasks.length === 0) {
      const empty = document.createElement("li");
      empty.className = "kosong";
      empty.textContent = "Tidak ada tugas di sini 🎉";
      list.append(empty);
      return;
    }

    tasks.forEach(task => {
      const item = document.createElement("li");
      item.dataset.id = task.id;
      item.classList.toggle("done", task.selesai);
      item.classList.toggle("proses", state.processing.has(task.id));

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.className = "cek";
      checkbox.checked = task.selesai;
      checkbox.disabled = state.processing.has(task.id);
      checkbox.setAttribute("aria-label", "Tandai " + task.judul + " selesai");

      const content = document.createElement("div");
      content.className = "isi";

      const title = document.createElement("div");
      title.className = "judul";
      title.textContent = task.judul;

      const meta = document.createElement("div");
      meta.className = "meta";
      meta.textContent = task.matkul + " · deadline " + task.deadline;

      const deleteButton = document.createElement("button");
      deleteButton.className = "hapus";
      deleteButton.type = "button";
      deleteButton.textContent = "✕";
      deleteButton.disabled = state.processing.has(task.id);
      deleteButton.setAttribute("aria-label", "Hapus " + task.judul);

      content.append(title, meta);
      item.append(checkbox, content, deleteButton);
      list.append(item);
    });
  }

  async function muat() {
    const version = ++loadVersion;
    state.status = "loading";
    state.error = "";
    state.notice = "";
    render();

    try {
      const [tasks, courses] = await Promise.all([
        api("/api/tugas"),
        api("/api/matkul")
      ]);

      if (version !== loadVersion) return;

      state.tugas = tasks;
      state.matkul = courses;
      const courseSelect = form.elements.matkul;
      courseSelect.replaceChildren(
        ...courses.map(course => new Option(course.nama, course.nama))
      );
      state.status = "success";
    } catch (requestError) {
      if (version !== loadVersion) return;

      state.status = "error";
      state.error = requestError.message;
    }

    render();
  }

  form.addEventListener("submit", async event => {
    event.preventDefault();

    const judul = form.elements.judul.value.trim();
    const deadline = form.elements.deadline.value;

    if (judul.length < 3) {
      error.textContent = "Judul minimal 3 karakter.";
      return;
    }

    if (!deadline) {
      error.textContent = "Deadline wajib diisi.";
      return;
    }

    error.textContent = "";
    state.saving = true;
    state.notice = "";
    render();

    try {
      const newTask = await api("/api/tugas", {
        method: "POST",
        body: {
          judul,
          matkul: form.elements.matkul.value,
          deadline
        }
      });

      state.tugas.push(newTask);
      form.reset();
      render();
    } catch (requestError) {
      error.textContent = "Gagal menyimpan: " + requestError.message;
    } finally {
      state.saving = false;
      render();
    }
  });

  list.addEventListener("click", async event => {
    if (!(event.target instanceof Element)) return;

    const item = event.target.closest("li[data-id]");
    if (!item) return;

    const taskId = Number(item.dataset.id);
    const task = state.tugas.find(currentTask => currentTask.id === taskId);
    if (!task || state.processing.has(taskId)) return;

    if (event.target.closest(".hapus")) {
      state.processing.add(taskId);
      state.notice = "";
      render();

      try {
        await api("/api/tugas/" + taskId, { method: "DELETE" });
        state.tugas = state.tugas.filter(currentTask => currentTask.id !== taskId);
      } catch (requestError) {
        state.notice = "Gagal menghapus tugas: " + requestError.message;
      } finally {
        state.processing.delete(taskId);
        render();
      }
      return;
    }

    if (event.target.closest(".cek")) {
      const checkbox = event.target.closest(".cek");
      const selesai = checkbox.checked;
      state.processing.add(taskId);
      state.notice = "";
      render();

      try {
        const updatedTask = await api("/api/tugas/" + taskId, {
          method: "PATCH",
          body: { selesai }
        });
        state.tugas = state.tugas.map(currentTask => (
          currentTask.id === taskId ? updatedTask : currentTask
        ));
      } catch (requestError) {
        state.notice = "Gagal memperbarui tugas: " + requestError.message;
      } finally {
        state.processing.delete(taskId);
        render();
      }
    }
  });

  filterBar.addEventListener("click", event => {
    if (!(event.target instanceof Element)) return;

    const button = event.target.closest("button[data-f]");
    if (!button) return;

    state.filter = button.dataset.f;
    filterBar.querySelectorAll("button").forEach(filterButton => {
      filterButton.classList.toggle("on", filterButton === button);
    });
    render();
  });

  info.addEventListener("click", event => {
    if (event.target instanceof Element && event.target.closest("#ulang")) {
      muat();
    }
  });

  document.querySelector("#reload").addEventListener("click", muat);

  document.querySelector("#net-select").addEventListener("change", event => {
    if (!window.__API || typeof window.__API.setMode !== "function") {
      state.notice = "Mock API tidak tersedia. Periksa koneksi atau script Mock API.";
      render();
      return;
    }
    window.__API.setMode(event.target.value);
    window.__API.setMode(event.target.value);
    muat();
  });

  muat();
})();
