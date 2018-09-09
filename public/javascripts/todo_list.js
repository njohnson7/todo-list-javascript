document.addEventListener('DOMContentLoaded', _ => {

//------------------------------------- utility functions --------------------------------//
const filterUnique = arr => [...new Set(arr)];

const qs          = (selector, parent = document) => parent.querySelector(selector);
const qsa         = (selector, parent = document) => [...parent.querySelectorAll(selector)];
const show        = elem => elem.style.display = 'block';
const hide        = elem => elem.style.display = 'none';
const addClass    = (elem, klass) => elem.classList.add(klass);
const removeClass = (elem, klass) => elem.classList.remove(klass);
const hasClass    = (elem, klass) => elem.classList.contains(klass);
const getText     = elem => elem.innerText.trim();
const setText     = (elem, text) => elem.innerText = text;

const getFields      = form => [...form].filter(elem => elem.name);
const urlEncodeField = field => field.map(encodeURIComponent).join('=');
const urlEncodeForm  = form => [...new FormData(form)].map(urlEncodeField).join('&');
const json           = response => response.json();


//--------------------------------------- helper functions -------------------------------//
const getTodoElems     = _ => [...mainTodosList.children];
const isTodoElem       = elem => hasClass(elem, 'todo');
const getClosestTodo   = elem => isTodoElem(elem) ? elem : getClosestTodo(elem.parentElement);
const isSection        = elem => elem.tagName == 'SECTION';
const getParentSection = elem => isSection(elem) ? elem : getParentSection(elem.parentElement);
const isListElem       = elem => hasClass(elem, 'list');
const getClosestList   = elem => isListElem(elem) ? elem : getClosestList(elem.parentElement);

const getCompletedBox = todoElem => qs('input.complete', todoElem);
const isCompleted     = todoElem => !!getCompletedBox(todoElem).checked;

const getDueDate     = todoElem => getText(qs('.due_date', todoElem));
const getAllDueDates = todoElems => filterUnique(todoElems.map(getDueDate));
const getDateWeight  = dueDate => {
  if (dueDate == 'No Due Date') return 0;
  let [month, year] = dueDate.split('/').map(Number);
  return month + year * MONTHS_PER_YEAR;
};
const compareDueDates = (date1, date2) => getDateWeight(date1) - getDateWeight(date2);
const sortDates       = dueDates => dueDates.sort(compareDueDates);

const isAnyDate = date => ['All Todos', 'Completed'].includes(date);
const filterByDate = (todoElems, date) => (
  isAnyDate(date) ? todoElems : todoElems.filter(todo => getDueDate(todo) == date)
);
const filterCompleted   = todoElems => todoElems.filter(isCompleted);
const countTodosInLists = lists => lists.reduce((sum, { count }) => sum + count, 0);

const isNotEmptyList   = list => list.count;
const removeEmptyLists = lists => lists.filter(isNotEmptyList);

const compareByCompleted = (todo1, todo2) => isCompleted(todo1) - isCompleted(todo2);
const compareById        = (todo1, todo2) => todo1.dataset.id - todo2.dataset.id;
const compareTodos       = (todo1, todo2) => compareByCompleted(todo1, todo2) || compareById(todo1, todo2);
const appendTodo         = todoElem => mainTodosList.appendChild(todoElem);
const sortTodoElems      = _ => getTodoElems().sort(compareTodos).forEach(appendTodo);

const getActiveList = _ => qs('.active', listsNav);
const getListName   = listElem => getText(qs('.list-name', listElem));
const getListCount  = listElem => getText(qs('.count',     listElem));
const isNotList     = elem => ['NAV', 'SECTION', 'UL'].includes(elem.tagName);

const hideModal = _ => hide(modal);
const showModal = _ => show(modal);

const updateTodoElem = todoObj => currentTodoElem.outerHTML = createTodoHtml(todoObj);
const isNewTodo      = _ => !currentTodoElem;


//------------------------------------- DOM elements --------------------------------------//
const newTodoButton         = qs('#new-todo-button');
const mainTodosList         = qs('#todos-list');
const modal                 = qs('#modal');
const form                  = qs('#todo-form');
const completeButton        = qs('#complete-button');
const activeListNameHeading = qs('#active-list-name');
const listsNav              = qs('#lists');
const allTodosList          = qs('#all-todos');
const listsOfLists = {
  allLists:       qs('#all-lists-list'),
  completedLists: qs('#completed-lists-list'),
};
const countBubbles = {
  allLists:       qs('.total-count'),
  completedLists: qs('.completed-count'),
  activeList:     qs('#active-list-count'),
};

let currentTodoElem = null;


//------------------------------------- constants --------------------------------------//
const MONTHS_PER_YEAR    = 12;
const LONG_YEAR_REGEX    = /\/\d\d(\d\d)/;
const ROOT_PATH          = '/api/todos';
const URL_ENCODED_HEADER = { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' };


//------------------------------------- Handlebars --------------------------------------//
const todoTemplate   = Handlebars.compile(qs('#todo-template').innerHTML);
const shortenYear    = todoHtml => todoHtml.replace(LONG_YEAR_REGEX, '/$1');
const createTodoHtml = todoObj => shortenYear(todoTemplate(todoObj));
const renderNewTodo  = todoObj => mainTodosList.innerHTML += createTodoHtml(todoObj);
const renderNewTodos = todoObjs => todoObjs.forEach(renderNewTodo);

const listTemplate    = Handlebars.compile(qs('#list-template').innerHTML);
const createListsHtml = lists => lists.map(listTemplate).join('');


//------------------------------------- main area --------------------------------------//
const toggleCompleted = (id, todoElem) => {
  let completedBox = getCompletedBox(todoElem);
  fetch(`${ROOT_PATH}/${id}/toggle_completed`, { method: 'POST' })
    .then(json)
    .then(todoObj => completedBox.checked = todoObj.completed)
    .then(sortTodoElems)
    .then(renderNav)
    .then(filterTodos);
};

const deleteTodo = (id, todoElem) => {
  fetch(`${ROOT_PATH}/${id}`, { method: 'DELETE' })
    .then(_ => todoElem.remove())
    .then(renderNav)
    .then(filterTodos);
};

const loadEditModal = (id, todoElem) => {
  fetch(`${ROOT_PATH}/${id}`)
    .then(json)
    .then(todoObj => {
      getFields(form).forEach(field => field.value = todoObj[field.name]);
    })
    .then(_ => currentTodoElem = todoElem)
    .then(showModal);
};

mainTodosList.onclick = e => {
  let elem = e.target;
  if (elem.type == 'checkbox' || elem == mainTodosList) return;

  let todoElem = getClosestTodo(elem);
  let id       = todoElem.dataset.id;

  if      (hasClass(elem, 'todo_title'))  loadEditModal(  id, todoElem);
  else if (hasClass(elem, 'todo_delete')) deleteTodo(     id, todoElem);
  else                                    toggleCompleted(id, todoElem);
};


//---------------------------------- modal/form -------------------------------------//
const loadNewTodoForm = _ => {
  form.reset();
  currentTodoElem = null;
  showModal();
};
newTodoButton.onclick = loadNewTodoForm;

modal.onclick = e => {
  if (e.target == modal) hideModal();
};

const addNewTodo = (headers, body) => {
  fetch(ROOT_PATH, {
    method:  'POST',
    headers,
    body,
  })
    .then(json)
    .then(renderNewTodo)
    .then(sortTodoElems)
    .then(_ => loadActiveList(allTodosList))
    .then(renderNav)
    .then(filterTodos)
    .then(hideModal);
};

const updateExistingTodo = (headers, body) => {
  fetch(`${ROOT_PATH}/${currentTodoElem.dataset.id}`, {
    method: 'PUT',
    headers,
    body,
  })
    .then(json)
    .then(updateTodoElem)
    .then(renderNav)
    .then(filterTodos)
    .then(hideModal);
};

form.onsubmit = e => {
  e.preventDefault();
  let body    = urlEncodeForm(form);
  let headers = URL_ENCODED_HEADER;
  isNewTodo() ? addNewTodo(headers, body) : updateExistingTodo(headers, body);
};

const completeTodo = _ => {
  let id = currentTodoElem.dataset.id;
  fetch(`${ROOT_PATH}/${id}`)
    .then(json)
    .then(todoObj => {
      if (todoObj.completed) return;
      toggleCompleted(id, currentTodoElem);
    })
    .then(hideModal);
};

completeButton.onclick = _ => {
  if (isNewTodo()) {
    alert('Cannot mark as complete because item has not been created yet!');
    return;
  }

  completeTodo();
};


//--------------------------------- lists/nav ------------------------------------//
const createLists = _ => {
  let todoElems   = getTodoElems();
  let sortedDates = sortDates(getAllDueDates(todoElems));

  return sortedDates.reduce((lists, date) => {
    let allTodos       = filterByDate(todoElems, date);
    let completedTodos = filterCompleted(allTodos);
    return { ...lists, [date]: { allTodos, completedTodos } };
  }, {});
};

const formatLists = lists => {
  let [allLists, completedLists] = [[], []];
  Object.entries(lists).forEach(([date, { allTodos, completedTodos }]) => {
    allLists.push(      { date, count: allTodos.length });
    completedLists.push({ date, count: completedTodos.length });
  });

  completedLists = removeEmptyLists(completedLists);
  return { allLists, completedLists };
};

const renderLists = _ => {
  let lists          = createLists();
  let formattedLists = formatLists(lists);

  Object.entries(formattedLists).forEach(([name, subLists]) => {
    listsOfLists[name].innerHTML = createListsHtml(subLists);
    setText(countBubbles[name], countTodosInLists(subLists));
  });
};

const reActivateList = (listName, parentSection) => {
  let lastActiveList = qsa('.list').find(list => (
    getParentSection(list) == parentSection && getListName(list) == listName
  ));

  if (lastActiveList) addClass(lastActiveList, 'active');
};

const renderNav = _ => {
  let activeList = getActiveList();
  if (!activeList) return;

  let activeListName = getListName(activeList);
  let parentSection  = getParentSection(activeList);

  renderLists();
  reActivateList(activeListName, parentSection);
};


//---------------------------------- filter todos ------------------------------------//
const filterTodos = _ => {
  let activeCount = 0;
  let activeList  = getActiveList();
  let allTodos    = getTodoElems();
  allTodos.forEach(hide);

  if (activeList) {
    let listName      = getListName(activeList);
    let completedOnly = hasClass(getParentSection(activeList), 'completed');
    let filteredTodos = filterByDate(allTodos, listName);
    if (completedOnly) filteredTodos = filterCompleted(filteredTodos);

    filteredTodos.forEach(show);
    activeCount = filteredTodos.length;
  }

  setText(countBubbles.activeList, activeCount);
};


//------------------------------- load/activate list ----------------------------------//
const loadActiveList = elem => {
  let targetList = getClosestList(elem);
  let activeList = getActiveList();
  if (targetList == activeList) return;

  if (activeList) removeClass(activeList, 'active');
  addClass(targetList, 'active');

  setText(activeListNameHeading,   getListName(targetList));
  setText(countBubbles.activeList, getListCount(targetList));
};

const handleListClick = ({ target: elem }) => {
  if (isNotList(elem)) return;
  loadActiveList(elem);
  filterTodos();
};
listsNav.onclick = handleListClick;


//----------------------------------- first load --------------------------------------//
const loadStartPage = _ => {
  fetch(ROOT_PATH)
    .then(json)
    .then(renderNewTodos)
    .then(sortTodoElems)
    .then(renderNav)
    .then(filterTodos);
};
loadStartPage();

});
