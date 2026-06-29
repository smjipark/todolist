let todos = [];
let currentFilter = 'all';
let selectedIds = new Set();

const FILTER_LABELS = {
  all: '전체 할 일',
  active: '진행 중인 할 일',
  done: '완료된 할 일',
};

function addTodo() {
  const input = document.getElementById('todoInput');
  const text = input.value.trim();
  if (!text) return;

  todos.push({ id: Date.now(), text, done: false });
  input.value = '';
  render();
}

function formatDate(date) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

function toggleTodo(id) {
  const todo = todos.find(t => t.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  todo.completedAt = todo.done ? formatDate(new Date()) : null;
  render();
}

function toggleSelect(id, checked) {
  if (checked) {
    selectedIds.add(id);
  } else {
    selectedIds.delete(id);
  }
  render();
}

function toggleSelectAll(checkbox) {
  if (checkbox.checked) {
    todos.forEach(t => selectedIds.add(t.id));
  } else {
    selectedIds.clear();
  }
  render();
}

function deleteSelected() {
  todos = todos.filter(t => !selectedIds.has(t.id));
  selectedIds.clear();
  render();
}

function setFilter(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  render();
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isMatch(todo) {
  if (currentFilter === 'active') return !todo.done;
  if (currentFilter === 'done') return todo.done;
  return true;
}

function render() {
  const list = document.getElementById('todoList');
  const summary = document.getElementById('summary');
  const contentTitle = document.getElementById('contentTitle');
  const deleteBtn = document.getElementById('deleteSelectedBtn');
  const selectedCount = document.getElementById('selectedCount');
  const selectAllCheckbox = document.getElementById('selectAll');

  const total = todos.length;
  const doneCount = todos.filter(t => t.done).length;
  const activeCount = total - doneCount;

  // 사이드바 뱃지 업데이트
  document.getElementById('badge-all').textContent = total;
  document.getElementById('badge-active').textContent = activeCount;
  document.getElementById('badge-done').textContent = doneCount;

  // 메인 타이틀 업데이트
  contentTitle.textContent = FILTER_LABELS[currentFilter];

  // 요약 텍스트
  summary.textContent = total > 0
    ? `전체 ${total}개 · 진행 중 ${activeCount}개 · 완료 ${doneCount}개`
    : '';

  // 선택 삭제 버튼 표시
  const count = selectedIds.size;
  if (count > 0) {
    deleteBtn.style.display = 'inline-block';
    selectedCount.textContent = `(${count}개)`;
  } else {
    deleteBtn.style.display = 'none';
  }

  // 전체 선택 체크박스 상태
  selectAllCheckbox.checked = total > 0 && selectedIds.size === total;
  selectAllCheckbox.indeterminate = selectedIds.size > 0 && selectedIds.size < total;

  // 목록 렌더링
  if (todos.length === 0) {
    list.innerHTML = '<div class="empty-msg">할 일을 추가해보세요!</div>';
    return;
  }

  list.innerHTML = todos.map(t => {
    const dimmed = !isMatch(t) ? 'dimmed' : '';
    const doneClass = t.done ? 'done' : '';
    const selectedClass = selectedIds.has(t.id) ? 'selected' : '';
    const statusLabel = t.done ? '완료' : '진행 중';
    const completedTime = t.done && t.completedAt
      ? `<span class="completed-at">🕐 ${t.completedAt}</span>`
      : '';
    return `
      <div class="todo-item ${doneClass} ${dimmed} ${selectedClass}">
        <input class="select-checkbox" type="checkbox" ${selectedIds.has(t.id) ? 'checked' : ''}
          onchange="toggleSelect(${t.id}, this.checked)" />
        <input type="checkbox" ${t.done ? 'checked' : ''} onchange="toggleTodo(${t.id})" />
        <div class="todo-body">
          <span class="todo-text">${escapeHtml(t.text)}</span>
          ${completedTime}
        </div>
        <span class="status-tag">${statusLabel}</span>
      </div>
    `;
  }).join('');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('todoInput').addEventListener('keydown', e => {
    if (e.key === 'Enter') addTodo();
  });

  render();
});
