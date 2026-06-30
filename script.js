import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_KEY
);

let todos = [];
let groups = [];
let currentUser = null;
let currentAuthMode = 'login';
let currentStatusFilter = 'all';
let currentGroupFilter = null;
let selectedIds = new Set();

const GROUP_COLORS = [
  { bg: '#dbeafe', text: '#1d4ed8' },
  { bg: '#dcfce7', text: '#166534' },
  { bg: '#fef9c3', text: '#854d0e' },
  { bg: '#fce7f3', text: '#9d174d' },
  { bg: '#ffedd5', text: '#9a3412' },
  { bg: '#e0f2fe', text: '#075985' },
  { bg: '#f0fdf4', text: '#14532d' },
  { bg: '#fdf4ff', text: '#7e22ce' },
];

// ── 인증 화면 ──────────────────────────────────

function showAuthScreen() {
  document.getElementById('authScreen').style.display = 'flex';
  document.getElementById('mainScreen').style.display = 'none';
}

function showMainScreen() {
  document.getElementById('authScreen').style.display = 'none';
  document.getElementById('mainScreen').style.display = 'flex';
  document.getElementById('userEmail').textContent = currentUser.email;
}

function showAuthTab(mode) {
  currentAuthMode = mode;
  document.getElementById('tabLogin').classList.toggle('active', mode === 'login');
  document.getElementById('tabSignup').classList.toggle('active', mode === 'signup');
  document.getElementById('authSubmitBtn').textContent = mode === 'login' ? '로그인' : '회원가입';
  document.getElementById('authMessage').textContent = '';
  document.getElementById('authMessage').style.color = '#ef4444';
}

function getKoreanAuthError(message) {
  if (message.includes('Invalid login credentials')) return '이메일 또는 비밀번호가 올바르지 않습니다.';
  if (message.includes('User already registered')) return '이미 등록된 이메일입니다.';
  if (message.includes('Email not confirmed')) return '이메일 인증이 필요합니다. 메일함을 확인해주세요.';
  if (message.includes('Password should be at least')) return '비밀번호는 6자 이상이어야 합니다.';
  if (message.includes('Unable to validate email') || message.includes('invalid')) return '올바른 이메일 형식이 아닙니다.';
  return message;
}

async function handleAuth() {
  const email = document.getElementById('authEmail').value.trim();
  const password = document.getElementById('authPassword').value;
  const messageEl = document.getElementById('authMessage');
  const btn = document.getElementById('authSubmitBtn');

  if (!email || !password) {
    messageEl.style.color = '#ef4444';
    messageEl.textContent = '이메일과 비밀번호를 입력해주세요.';
    return;
  }

  btn.disabled = true;
  btn.textContent = '처리 중...';
  messageEl.textContent = '';

  if (currentAuthMode === 'login') {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      messageEl.style.color = '#ef4444';
      messageEl.textContent = getKoreanAuthError(error.message);
      btn.disabled = false;
      btn.textContent = '로그인';
    }
  } else {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) {
      messageEl.style.color = '#ef4444';
      messageEl.textContent = getKoreanAuthError(error.message);
    } else {
      messageEl.style.color = '#6366f1';
      messageEl.textContent = '가입 확인 이메일을 보냈습니다. 메일함을 확인해주세요.';
    }
    btn.disabled = false;
    btn.textContent = '회원가입';
  }
}

async function logout() {
  await supabase.auth.signOut();
  todos = [];
  groups = [];
  currentGroupFilter = null;
  selectedIds.clear();
}

// ── 데이터 로드 ────────────────────────────────

async function loadData() {
  const [{ data: groupData, error: groupErr }, { data: todoData, error: todoErr }] = await Promise.all([
    supabase.from('groups').select('*').order('id'),
    supabase.from('todos').select('*').order('created_at'),
  ]);

  if (groupErr || todoErr) {
    console.error('groups 오류:', groupErr);
    console.error('todos 오류:', todoErr);
    alert(`데이터를 불러오는 중 오류가 발생했습니다.\n${(groupErr || todoErr).message}`);
    return;
  }

  groups = (groupData || []).map(g => ({
    id: g.id,
    name: g.name,
    color: { bg: g.color_bg, text: g.color_text },
  }));

  todos = (todoData || []).map(t => ({
    id: t.id,
    title: t.title,
    description: t.description,
    groupId: t.group_id,
    done: t.done,
    completedAt: t.completed_at,
  }));

  renderGroupChips();
  renderGroupSelect();
  render();
}

// ── 모달 ──────────────────────────────────────

function openAddModal() {
  document.getElementById('addModal').classList.add('open');
  document.getElementById('modalOverlay').classList.add('open');
  setTimeout(() => document.getElementById('todoTitle').focus(), 350);
}

function closeAddModal() {
  document.getElementById('addModal').classList.remove('open');
  document.getElementById('modalOverlay').classList.remove('open');
  document.getElementById('todoTitle').value = '';
  document.getElementById('todoDesc').value = '';
  document.getElementById('todoGroup').value = '';
}

// ── 그룹 관리 ────────────────────────────────

function toggleGroupInput() {
  const area = document.getElementById('groupInputArea');
  const isOpen = area.style.display !== 'none';
  area.style.display = isOpen ? 'none' : 'flex';
  if (!isOpen) {
    const input = document.getElementById('newGroupName');
    input.value = '';
    input.focus();
  }
}

async function addGroup() {
  const input = document.getElementById('newGroupName');
  const name = input.value.trim();
  if (!name) return;

  const colorIndex = groups.length % GROUP_COLORS.length;
  const color = GROUP_COLORS[colorIndex];

  const { error } = await supabase.from('groups').insert({
    name,
    color_bg: color.bg,
    color_text: color.text,
    user_id: currentUser.id,
  });

  if (error) { alert('그룹 추가 중 오류가 발생했습니다.'); return; }

  input.value = '';
  document.getElementById('groupInputArea').style.display = 'none';
  await loadData();
}

async function deleteGroup(id) {
  const { error } = await supabase.from('groups').delete().eq('id', id);
  if (error) { alert('그룹 삭제 중 오류가 발생했습니다.'); return; }
  if (currentGroupFilter === id) currentGroupFilter = null;
  await loadData();
}

function setGroupFilter(id) {
  currentGroupFilter = (currentGroupFilter === id) ? null : id;
  renderGroupChips();
  render();
}

function clearGroupFilter() {
  currentGroupFilter = null;
  renderGroupChips();
  render();
}

function renderGroupChips() {
  const chips = document.getElementById('groupChips');
  let html = '';

  if (groups.length > 0) {
    const allActive = currentGroupFilter === null;
    html += `<button class="chip ${allActive ? 'chip-active' : ''}" onclick="clearGroupFilter()">전체</button>`;

    html += groups.map(g => {
      const isActive = currentGroupFilter === g.id;
      const inlineStyle = isActive
        ? `background:${g.color.bg};color:${g.color.text};border-color:${g.color.text}`
        : '';
      return `
        <button class="chip" style="${inlineStyle}" onclick="setGroupFilter(${g.id})">
          <span class="chip-dot" style="background:${g.color.text}"></span>
          ${escapeHtml(g.name)}
          <button class="chip-delete" onclick="event.stopPropagation();deleteGroup(${g.id})">×</button>
        </button>
      `;
    }).join('');
  }

  html += `<button class="chip chip-add" onclick="toggleGroupInput()">＋</button>`;
  chips.innerHTML = html;
}

function renderGroupSelect() {
  const select = document.getElementById('todoGroup');
  const current = select.value;
  select.innerHTML = '<option value="">📁 그룹 없음</option>' +
    groups.map(g => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  if (current) select.value = current;
}

// ── 할 일 관리 ──────────────────────────────

async function addTodo() {
  const title = document.getElementById('todoTitle').value.trim();
  if (!title) return;

  const desc = document.getElementById('todoDesc').value.trim();
  const groupVal = document.getElementById('todoGroup').value;
  const groupId = groupVal ? parseInt(groupVal) : null;

  const { error } = await supabase.from('todos').insert({
    title,
    description: desc,
    group_id: groupId,
    done: false,
    completed_at: null,
    user_id: currentUser.id,
  });

  if (error) { alert('할 일 추가 중 오류가 발생했습니다.'); return; }

  closeAddModal();
  await loadData();
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

async function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  const newDone = !todo.done;
  const completedAt = newDone ? formatDate(new Date()) : null;

  const { error } = await supabase.from('todos').update({
    done: newDone,
    completed_at: completedAt,
  }).eq('id', id);

  if (error) { alert('업데이트 중 오류가 발생했습니다.'); return; }

  await loadData();
}

function toggleSelect(id, checked) {
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  render();
}

function toggleSelectAll(checkbox) {
  const visible = getVisibleTodos();
  if (checkbox.checked) visible.forEach(t => selectedIds.add(t.id));
  else visible.forEach(t => selectedIds.delete(t.id));
  render();
}

async function deleteSelected() {
  const ids = [...selectedIds];
  const { error } = await supabase.from('todos').delete().in('id', ids);
  if (error) { alert('삭제 중 오류가 발생했습니다.'); return; }
  selectedIds.clear();
  await loadData();
}

function setStatusFilter(filter, btn) {
  currentStatusFilter = filter;
  document.querySelectorAll('.tab-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

// ── 렌더링 ─────────────────────────────────

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getVisibleTodos() {
  return todos.filter(t => {
    if (currentGroupFilter !== null && t.groupId !== currentGroupFilter) return false;
    if (currentStatusFilter === 'active' && t.done) return false;
    if (currentStatusFilter === 'done' && !t.done) return false;
    return true;
  });
}

function render() {
  const list = document.getElementById('todoList');
  const selectBar = document.getElementById('selectBar');
  const selectAll = document.getElementById('selectAll');

  const total = todos.length;
  const doneCount = todos.filter(t => t.done).length;
  const activeCount = total - doneCount;

  const updateBadge = (id, count) => {
    const el = document.getElementById(id);
    el.textContent = count || '';
    el.classList.toggle('visible', count > 0);
  };
  updateBadge('badge-all', total);
  updateBadge('badge-active', activeCount);
  updateBadge('badge-done', doneCount);

  const selCount = selectedIds.size;
  selectBar.style.display = selCount > 0 ? 'flex' : 'none';
  if (selCount > 0) document.getElementById('selectedCount').textContent = `(${selCount}개)`;

  const visibleTodos = getVisibleTodos();
  const selVisCount = visibleTodos.filter(t => selectedIds.has(t.id)).length;
  selectAll.checked = visibleTodos.length > 0 && selVisCount === visibleTodos.length;
  selectAll.indeterminate = selVisCount > 0 && selVisCount < visibleTodos.length;

  if (visibleTodos.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-icon">📝</span>
        <p class="empty-msg">할 일이 없습니다.</p>
        <p class="empty-hint">＋ 버튼을 눌러 추가해보세요</p>
      </div>
    `;
    return;
  }

  list.innerHTML = visibleTodos.map(t => {
    const doneClass = t.done ? 'done' : '';
    const selectedClass = selectedIds.has(t.id) ? 'selected' : '';

    const group = groups.find(g => g.id === t.groupId);
    const groupTag = group
      ? `<span class="group-tag" style="background:${group.color.bg};color:${group.color.text}">${escapeHtml(group.name)}</span>`
      : '';

    const doneBadge = t.done ? `<span class="done-badge">완료</span>` : '';

    const descHtml = t.description
      ? `<span class="todo-desc">${escapeHtml(t.description)}</span>`
      : '';

    const completedHtml = t.done && t.completedAt
      ? `<span class="completed-at">🕐 ${t.completedAt}</span>`
      : '';

    return `
      <div class="todo-item ${doneClass} ${selectedClass}">
        <input class="select-checkbox" type="checkbox" ${selectedIds.has(t.id) ? 'checked' : ''}
          onchange="toggleSelect(${t.id}, this.checked)" />
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${t.id})" />
        <div class="todo-body">
          <span class="todo-title">${escapeHtml(t.title)}</span>
          ${descHtml}
          ${completedHtml}
        </div>
        <div class="todo-tags">
          ${groupTag}
          ${doneBadge}
        </div>
      </div>
    `;
  }).join('');
}

// ── ES Module에서 inline onclick 사용을 위해 전역 등록 ──

Object.assign(window, {
  showAuthTab, handleAuth, logout,
  openAddModal, closeAddModal,
  toggleGroupInput, addGroup, deleteGroup, setGroupFilter, clearGroupFilter,
  addTodo, toggleTodo, toggleSelect, toggleSelectAll, deleteSelected, setStatusFilter,
});

// ── 초기화 ─────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // 인증 상태 변화 감지 → 화면 전환
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user ?? null;
    if (currentUser) {
      showMainScreen();
      loadData();
    } else {
      showAuthScreen();
    }
  });

  // 키보드 단축키 (인증 화면)
  document.getElementById('authEmail').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('authPassword').focus();
  });
  document.getElementById('authPassword').addEventListener('keydown', e => {
    if (e.key === 'Enter') handleAuth();
  });

  // 키보드 단축키 (메인 화면)
  document.getElementById('todoTitle').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
    if (e.key === 'Escape') closeAddModal();
  });
  document.getElementById('todoDesc').addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAddModal();
  });
  document.getElementById('newGroupName').addEventListener('keydown', e => {
    if (e.key === 'Enter') addGroup();
    if (e.key === 'Escape') toggleGroupInput();
  });
});
