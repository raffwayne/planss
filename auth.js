const Auth = {
  initStorage() {},

  getCurrentUser() {
    return localStorage.getItem('currentUser');
  },

  register(username, password) {
    if (!username || !password || password.length < 6) {
      return false;
    }

    const userKey = `user_${username}`;
    if (localStorage.getItem(userKey)) {
      return false;
    }

    const today = new Date().toISOString().split('T')[0];

    const userData = {
      password,
      folders: [
        { id: 'home', name: 'Дом', builtIn: true },
        { id: 'work', name: 'Работа', builtIn: true },
        { id: 'study', name: 'Учёба', builtIn: true }
      ],
      tasks: [
        {
          id: `task_${Date.now()}`,
          text: 'Добро пожаловать! Это ваша первая задача.',
          completed: false,
          priority: 'medium',
          folderId: 'all',
          date: today
        }
      ],
      currentFolderId: 'all',
      selectedDate: today
    };

    localStorage.setItem(userKey, JSON.stringify(userData));
    return true;
  },

  login(username, password) {
    if (!username || !password) return false;

    const userKey = `user_${username}`;
    const userDataStr = localStorage.getItem(userKey);

    if (!userDataStr) return false;

    try {
      const userData = JSON.parse(userDataStr);
      if (userData.password === password) {
        localStorage.setItem('currentUser', username);
        return true;
      }
    } catch (e) {
      console.error('Ошибка парсинга данных пользователя:', e);
      return false;
    }

    return false;
  },

  logout() {
    localStorage.removeItem('currentUser');
  },

  getUserData(username) {
    if (!username) return null;
    const data = localStorage.getItem(`user_${username}`);
    if (!data) return null;
    try {
      return JSON.parse(data);
    } catch (e) {
      console.error('Ошибка чтения данных пользователя:', e);
      return null;
    }
  },

  saveUserData(username, data) {
    if (!username || !data) return;
    localStorage.setItem(`user_${username}`, JSON.stringify(data));
  }
};

window.Auth = Auth;