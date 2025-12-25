document.addEventListener('DOMContentLoaded', () => {
  if (typeof Auth === 'undefined') {
    console.error('❌ Auth не загружен.');
    return;
  }

  const loginScreen = document.getElementById('loginScreen');
  const plannerScreen = document.getElementById('plannerScreen');
  const authMessage = document.getElementById('authMessage');

  const loginUsername = document.getElementById('loginUsername');
  const loginPassword = document.getElementById('loginPassword');
  const loginBtn = document.getElementById('loginBtn');
  const registerBtn = document.getElementById('registerBtn');
  const logoutBtn = document.getElementById('logoutBtn');

  const taskInput = document.getElementById('taskInput');
  const prioritySelect = document.getElementById('prioritySelect');
  const addTaskBtn = document.getElementById('addTaskBtn');
  const taskList = document.getElementById('taskList');

  const foldersBar = document.getElementById('foldersBar');
  const addFolderBtn = document.getElementById('addFolderBtn');

  const calendarGrid = document.getElementById('calendarGrid');
  const currentMonthYearEl = document.getElementById('currentMonthYear');
  const prevMonthBtn = document.getElementById('prevMonthBtn');
  const nextMonthBtn = document.getElementById('nextMonthBtn');

  let currentFolderId = 'all';
  let currentDateView = new Date();
  let selectedDate = new Date().toISOString().split('T')[0];

  function formatDate(date) {
    return date.toISOString().split('T')[0];
  }

  function getDaysInMonth(date) {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDayOfWeek = firstDay.getDay();

    const days = [];
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      days.push({ date: new Date(year, month - 1, day), isCurrent: false });
    }
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ date: new Date(year, month, day), isCurrent: true });
    }
    const remaining = 42 - days.length;
    for (let day = 1; day <= remaining; day++) {
      days.push({ date: new Date(year, month + 1, day), isCurrent: false });
    }
    return days;
  }

  function getTodayString() {
    return new Date().toISOString().split('T')[0];
  }

  function renderCalendar(date) {
    currentMonthYearEl.textContent = date.toLocaleDateString('ru', { month: 'long', year: 'numeric' });
    const days = getDaysInMonth(date);
    calendarGrid.innerHTML = '';

    const todayStr = getTodayString();
    const user = Auth.getCurrentUser();
    const data = user ? Auth.getUserData(user) : null;
    const tasksByDate = {};
    if (data && Array.isArray(data.tasks)) {
      data.tasks.forEach(task => {
        if (!tasksByDate[task.date]) tasksByDate[task.date] = 0;
        tasksByDate[task.date]++;
      });
    }

    days.forEach(({ date: dayDate, isCurrent }) => {
      const dayStr = formatDate(dayDate);
      const dayEl = document.createElement('div');
      dayEl.className = 'calendar-day';
      if (!isCurrent) dayEl.classList.add('other-month');
      if (dayStr === todayStr) dayEl.classList.add('today');
      if (dayStr === selectedDate) dayEl.classList.add('selected');

      dayEl.textContent = dayDate.getDate();

      if (tasksByDate[dayStr] > 0) {
        const countEl = document.createElement('span');
        countEl.className = 'task-count';
        countEl.textContent = tasksByDate[dayStr] > 9 ? '9+' : tasksByDate[dayStr];
        dayEl.appendChild(countEl);
      }

      dayEl.addEventListener('click', () => {
        selectedDate = dayStr;
        renderCalendar(currentDateView);
        if (user) {
          const d = Auth.getUserData(user);
          d.selectedDate = selectedDate;
          Auth.saveUserData(user, d);
          renderTasks(d.tasks, currentFolderId, selectedDate);
        }
      });

      calendarGrid.appendChild(dayEl);
    });
  }

  function checkAuth() {
    const user = Auth.getCurrentUser();
    if (user) {
      loginScreen.classList.add('hidden');
      plannerScreen.classList.remove('hidden');
      loadUserData(user);
    } else {
      loginScreen.classList.remove('hidden');
      plannerScreen.classList.add('hidden');
    }
  }

  function loadUserData(username) {
    const data = Auth.getUserData(username);
    if (!data) {
      Auth.logout();
      checkAuth();
      return;
    }

    let folders = data.folders || [
      { id: 'home', name: 'Дом', builtIn: true },
      { id: 'work', name: 'Работа', builtIn: true },
      { id: 'study', name: 'Учёба', builtIn: true }
    ];

    let tasks = Array.isArray(data.tasks) ? data.tasks : [];
    tasks = tasks.map(task => {
      if (task.folderId === undefined) task.folderId = 'all';
      if (!task.date) task.date = getTodayString();
      if (!task.id) task.id = `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      return task;
    });

    currentFolderId = data.currentFolderId === 'all' || folders.some(f => f.id === data.currentFolderId)
      ? data.currentFolderId
      : 'all';

    selectedDate = data.selectedDate || getTodayString();
    currentDateView = new Date(selectedDate);

    Auth.saveUserData(username, { ...data, folders, tasks, currentFolderSize: currentFolderId, selectedDate });
    renderFolders(folders);
    renderCalendar(currentDateView);
    renderTasks(tasks, currentFolderId, selectedDate);
  }

  function showMessage(text, isError = false) {
    if (authMessage) {
      authMessage.textContent = text;
      authMessage.style.color = isError ? 'var(--poppy)' : 'var(--chocolate)';
      authMessage.style.backgroundColor = isError ? 'rgba(230, 57, 70, 0.15)' : 'rgba(237, 224, 212, 0.9)';
      authMessage.style.borderColor = isError ? 'var(--poppy)' : 'var(--mocha)';
    }
  }

  function renderFolders(folders) {
    foldersBar.innerHTML = '';

    const allTab = document.createElement('div');
    allTab.className = `folder-tab ${currentFolderId === 'all' ? 'active' : ''}`;
    allTab.textContent = 'Все задачи';
    allTab.addEventListener('click', () => switchFolder('all'));
    foldersBar.appendChild(allTab);

    folders.forEach(folder => {
      const tab = document.createElement('div');
      tab.className = `folder-tab ${folder.id === currentFolderId ? 'active' : ''}`;
      tab.textContent = folder.name;

      const user = Auth.getCurrentUser();
      const data = Auth.getUserData(user);
      const isDeletable = !folder.builtIn && data && data.folders.length > 1;
      if (isDeletable) {
        const del = document.createElement('span');
        del.className = 'delete-folder';
        del.textContent = '✕';
        del.addEventListener('click', e => {
          e.stopPropagation();
          deleteFolder(folder.id);
        });
        tab.appendChild(del);
      }

      tab.addEventListener('click', () => switchFolder(folder.id));
      foldersBar.appendChild(tab);
    });
  }

  function switchFolder(folderId) {
    currentFolderId = folderId;
    const user = Auth.getCurrentUser();
    const data = Auth.getUserData(user);
    if (data) {
      data.currentFolderId = folderId;
      Auth.saveUserData(user, data);
      renderFolders(data.folders);
      renderTasks(data.tasks, folderId, selectedDate);
    }
  }

  function deleteFolder(folderId) {
    if (!confirm('Удалить папку и все её задачи?')) return;

    const user = Auth.getCurrentUser();
    const data = Auth.getUserData(user);
    if (!data || data.folders.length <= 1) {
      showMessage('Нельзя удалить последнюю папку', true);
      return;
    }

    data.folders = data.folders.filter(f => f.id !== folderId);
    data.tasks = data.tasks.filter(t => t.folderId !== folderId);

    if (currentFolderId === folderId) {
      currentFolderId = data.folders[0]?.id || 'all';
      data.currentFolderId = currentFolderId;
    }

    Auth.saveUserData(user, data);
    renderFolders(data.folders);
    renderTasks(data.tasks, currentFolderId, selectedDate);
  }

  function renderTasks(tasks, folderId, date) {
    taskList.innerHTML = '';

    let filtered = tasks.filter(task => task.date === date);
    if (folderId !== 'all') {
      filtered = filtered.filter(task => task.folderId === folderId);
    }

    const priorityOrder = { high: 0, medium: 1, low: 2 };
    filtered.sort((a, b) => {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    });

    if (filtered.length === 0) {
      const empty = document.createElement('li');
      empty.className = 'task-item';
      empty.innerHTML = '<div class="task-text" style="text-align:center;opacity:0.6;font-style:italic;">Нет задач на этот день</div>';
      taskList.appendChild(empty);
      return;
    }

    filtered.forEach(task => {
      const li = document.createElement('li');
      li.className = `task-item ${task.completed ? 'completed' : ''}`;

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => toggleTask(task.id, checkbox.checked));

      const icon = document.createElement('span');
      icon.className = 'priority-icon';
      icon.textContent = task.priority === 'high' ? '🔴' : task.priority === 'medium' ? '🟡' : '🟢';

      const text = document.createElement('span');
      text.className = 'task-text';
      if (task.completed) text.classList.add('completed');
      text.textContent = task.text;

      const delBtn = document.createElement('button');
      delBtn.className = 'delete-btn';
      delBtn.textContent = '×';
      delBtn.addEventListener('click', () => deleteTask(task.id));

      li.append(checkbox, icon, text, delBtn);
      taskList.appendChild(li);
    });
  }

  function addTask() {
    const text = taskInput?.value.trim();
    if (!text) return;

    const user = Auth.getCurrentUser();
    const data = Auth.getUserData(user);
    if (!data) return;

    data.tasks.push({
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      completed: false,
      priority: prioritySelect.value || 'low',
      folderId: currentFolderId,
      date: selectedDate
    });

    Auth.saveUserData(user, data);
    renderTasks(data.tasks, currentFolderId, selectedDate);
    renderCalendar(currentDateView);
    taskInput.value = '';
    taskInput.focus();
  }

  function toggleTask(taskId, completed) {
    const user = Auth.getCurrentUser();
    const data = Auth.getUserData(user);
    if (!data) return;
    const task = data.tasks.find(t => t.id === taskId);
    if (task) {
      task.completed = completed;
      Auth.saveUserData(user, data);
      renderTasks(data.tasks, currentFolderId, selectedDate);
    }
  }

  function deleteTask(taskId) {
    const user = Auth.getCurrentUser();
    const data = Auth.getUserData(user);
    if (!data) return;
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    Auth.saveUserData(user, data);
    renderTasks(data.tasks, currentFolderId, selectedDate);
    renderCalendar(currentDateView);
  }

  function setupAddFolder() {
    addFolderBtn?.addEventListener('click', () => {
      if (document.getElementById('folder-input-inline')) return;

      const container = document.createElement('div');
      container.id = 'folder-input-container';
      container.style.display = 'flex';
      container.style.gap = '8px';
      container.style.margin = '0 auto 16px';
      container.style.maxWidth = '300px';
      container.style.justifyContent = 'center';

      const input = document.createElement('input');
      input.id = 'folder-input-inline';
      input.placeholder = 'Название папки';
      input.style.padding = '10px';
      input.style.borderRadius = '12px';
      input.style.border = '2px solid var(--earth)';
      input.style.background = 'var(--latte)';
      input.style.color = 'var(--chocolate)';
      input.focus();

      const btn = document.createElement('button');
      btn.textContent = '+';
      Object.assign(btn.style, {
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        background: 'var(--tan)',
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 2px 6px rgba(156,102,68,0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '18px'
      });

      const create = () => {
        const name = input.value.trim();
        if (name) {
          const user = Auth.getCurrentUser();
          const data = Auth.getUserData(user);
          if (data) {
            data.folders.push({ id: `folder_${Date.now()}`, name, builtIn: false });
            currentFolderId = data.folders[data.folders.length - 1].id;
            data.currentFolderId = currentFolderId;
            Auth.saveUserData(user, data);
            renderFolders(data.folders);
            renderTasks(data.tasks, currentFolderId, selectedDate);
          }
        }
        container.remove();
      };

      input.addEventListener('keypress', e => e.key === 'Enter' && create());
      btn.addEventListener('click', create);
      input.addEventListener('blur', () => setTimeout(() => {
        if (document.body.contains(container)) container.remove();
      }, 150));

      container.append(input, btn);
      addFolderBtn.parentNode.insertBefore(container, addFolderBtn.nextSibling);
    });
  }

  loginBtn?.addEventListener('click', () => {
    const u = loginUsername?.value.trim();
    const p = loginPassword?.value;
    if (u && p && Auth.login(u, p)) {
      showMessage('');
      checkAuth();
    } else {
      showMessage('❌ Неверный логин или пароль', true);
    }
  });

  registerBtn?.addEventListener('click', () => {
    const u = loginUsername?.value.trim();
    const p = loginPassword?.value;
    if (!u || !p) {
      showMessage('❌ Заполните все поля', true);
      return;
    }
    if (p.length < 6) {
      showMessage('❌ Пароль должен быть не менее 6 символов', true);
      return;
    }
    if (Auth.register(u, p)) {
      Auth.login(u, p);
      showMessage('✅ Регистрация успешна!', false);
      setTimeout(checkAuth, 500);
    } else {
      showMessage('❌ Пользователь уже существует', true);
    }
  });

  logoutBtn?.addEventListener('click', () => {
    Auth.logout();
    checkAuth();
  });

  addTaskBtn?.addEventListener('click', addTask);
  taskInput?.addEventListener('keypress', e => e.key === 'Enter' && addTask());
  setupAddFolder();

  prevMonthBtn?.addEventListener('click', () => {
    currentDateView.setMonth(currentDateView.getMonth() - 1);
    renderCalendar(currentDateView);
  });

  nextMonthBtn?.addEventListener('click', () => {
    currentDateView.setMonth(currentDateView.getMonth() + 1);
    renderCalendar(currentDateView);
  });

  checkAuth();
});