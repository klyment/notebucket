(function() {
    'use strict';

    angular.module('application', [
        'ui.router',
        'ngAnimate',

        //foundation
        'foundation',
        'foundation.dynamicRouting',
        'foundation.dynamicRouting.animations',
        'firebase'
    ])
        .config(config)
        .run(run);

    config.$inject = ['$urlRouterProvider', '$locationProvider'];

    function config($urlProvider, $locationProvider) {
        $urlProvider.otherwise('/');

        $locationProvider.html5Mode({
            enabled: false,
            requireBase: false
        });

        $locationProvider.hashPrefix('!');
    }

    function run() {
        FastClick.attach(document.body);
    }

    // START CUSTOM APP CODE

    // Start custom controller

    angular.module('application').controller('TasksController', TasksController);
    TasksController.$inject = ['$scope', '$stateParams', '$state', '$controller', '$firebaseArray', '$firebaseAuth', '$firebaseObject'];

    // Thanks to LuminusDev for tip on extending DefaultController to preserve
    // page animation functionality https://github.com/zurb/foundation-apps/issues/368
    function TasksController($scope, $stateParams, $state, $controller, $firebaseArray, $firebaseAuth, $firebaseObject) {

        angular.extend(this, $controller('DefaultController', {
            $scope: $scope,
            $stateParams: $stateParams,
            $state: $state
        }));

        // localStorage.removeItem("saved_tasks");
        // localStorage.removeItem("all_tags");

        $scope.editMode = false;

        $scope.showstatus = 'incomplete';

        $scope.showcolor = '';

        $scope.showboard = '';

        $scope.myDebounce = 0;

        angular.element(document).ready(function() {
            $scope.initializer();

        });

        $scope.tasks = JSON.parse(localStorage.getItem("saved_tasks"));

        $scope.allBoards = JSON.parse(localStorage.getItem("all_boards"));

        $scope.initializer = function(username) {

            username = "userid";

            $scope.boardref = new Firebase("https://scorching-fire-7914.firebaseio.com/" + username + "/all_boards");
            $scope.taskref = new Firebase("https://scorching-fire-7914.firebaseio.com/" + username + "/saved_tasks");

            $scope.feedbackref = new Firebase("https://scorching-fire-7914.firebaseio.com/feedback");

            $scope.boarddata = $firebaseArray($scope.boardref);

            $scope.taskdata = $firebaseArray($scope.taskref);

            $scope.feedbackdata = $firebaseArray($scope.feedbackref);

            if (typeof $scope.tasks === 'undefined' || $scope.tasks === null) {
                $scope.tasks = $scope.taskdata;
            }

            if (typeof $scope.allBoards === 'undefined' || $scope.allBoards === null) {
                $scope.allBoards = $scope.boarddata;
            }

            $scope.boarddata.$loaded(function(){
                console.log("board loaded");
                localStorage.setItem("all_boards", JSON.stringify($scope.allBoards));
                $scope.defaultTaskBoard();
            },function(error){
                console.error("Error:",error);
            });

            $scope.taskdata.$loaded(function(){
                console.log("tasks loaded");
                localStorage.setItem("saved_tasks", JSON.stringify($scope.tasks));
                $scope.setLayer(300);
            },function(error){
                console.error("Error:",error);
            });

            $scope.feedbackdata.$loaded(function(){
                console.log("feedback loaded")
            },function(error){
                console.error("Error:",error);
            });


            window.onresize = function(event) {
                $scope.setLayer(300);
            };

        };


        $scope.defaultTaskBoard = function(board) {

            if (board != null) {

                for (var i = 0; i < $scope.allBoards.length; i++) {

                    if ($scope.allBoards[i].name == board) {
                        //console.log("yes");
                        $scope.taskBoard = $scope.allBoards[i];
                    }
                }
            } else if ($scope.allBoards != null) {
                $scope.taskBoard = $scope.allBoards[0];
            } else {
                $scope.taskBoard = '';
            }

        }

        $scope.CreateTask = function(title, body, board) {

            var task = {};
            var taskid = Date.now();

            task.body = body;
            task.status = 'incomplete';
            task.color = '';
            task.board = board;
            // Set unique ID from current timestamp
            task.id = taskid;
            task.title = title;



            var modifiedTask = {};

            modifiedTask.board = board;
            modifiedTask.title = title;
            modifiedTask.body = body;
            modifiedTask.color = '';
            modifiedTask.status = 'incomplete';
            modifiedTask.id = taskid;

            $scope.taskdata.$add(modifiedTask).then(function(ref) {
                task.$id = ref.key();
                task.$priority = null;
                console.log("New Task Created");
                $scope.tasks.push(task);
                localStorage.setItem("saved_tasks", JSON.stringify($scope.tasks));
                $scope.setLayer(300);
            });


        };

        // $scope.DeleteTask = function(id){

        //   // Store the tags used by this task
        //   var these_tags;

        //   // Delete task
        //   $scope.tasks = $scope.tasks.filter(function(element) {
        //     if (element.id != id) {
        //       // Add non-targeted element back into the array
        //       return element;
        //     } else {
        //       // When target is found, store the tags is uses
        //       these_tags = element.tags;
        //     }
        //   });

        //   // Check if this theme's tags used by other tasks
        //   // If not, delete from "allTags"
        //   for (var tag = 0; tag < these_tags.length; tag++) {

        //     var check_tag = these_tags[tag];

        //     for (var i = 0; i < $scope.tasks.length; i++) {
        //       var this_task = $scope.tasks[i];
        //       var tag_on_other = ( this_task.tags.indexOf(check_tag) == -1 ) ? false : true;

        //       if (!tag_on_other){
        //         $scope.allTags = $scope.allTags.filter(function(element) {
        //           return element != check_tag;
        //         });
        //       }
        //     }

        //   }
        // }


        $scope.CreateBoard = function(board) {

            var newBoard = {};
            newBoard.name = board;
            newBoard.status = 'unarchived';

            var modifiedBoard = {};

            modifiedBoard.name = board;
            modifiedBoard.status = 'unarchived';

            $scope.boarddata.$add(modifiedBoard).then(function(ref) {
                newBoard.$id = ref.key();
                newBoard.$priority = null;
                console.log("Created board");
                $scope.allBoards.push(newBoard);
                localStorage.setItem("all_boards", JSON.stringify($scope.allBoards));
            });


        }

        $scope.SendFeedback = function(guest,content) {

            $scope.feedbackdata.$add({
                'guest':guest,
                'feedback':content
            }).then(function(){
               console.log("Feedback Sent");
            });

        }

        $scope.ArchiveBoard = function(board) {

            var findTask = $scope.tasks.filter(function(element) {
                if (element.board == board) {

                    element.status = 'complete';

                    return element;

                } else {

                    return element;

                }
            });

            for (var i = 0; i < $scope.taskdata.length; i++) {

                if ($scope.taskdata[i].board == board) {

                    $scope.taskdata[i].status = 'complete';

                    $scope.taskdata.$save($scope.taskdata[i]).then(function(ref) {
                        console.log("Task archived.");
                    });
                }
            }


            var findBoard = $scope.allBoards.filter(function(element) {
                if (element.name == board) {

                    element.status = 'archived';

                    return element;

                } else {

                    return element;

                }

            });

            for (var b = 0; b < $scope.boarddata.length; b++) {

                if ($scope.boarddata[b].name == board) {

                    $scope.boarddata[b].status = 'archived';

                    $scope.boarddata.$save($scope.boarddata[b]).then(function(ref) {
                        console.log("Board archived.");
                    });
                }
            }

            localStorage.setItem("all_boards", JSON.stringify($scope.allBoards));
            localStorage.setItem("saved_tasks", JSON.stringify($scope.tasks));
        }

        $scope.UnarchiveBoard = function(board) {

            var findTask = $scope.tasks.filter(function(element) {
                if (element.board == board) {

                    element.status = 'incomplete';

                    return element;

                } else {

                    return element;

                }
            });

            for (var i = 0; i < $scope.taskdata.length; i++) {

                if ($scope.taskdata[i].board == board) {

                    $scope.taskdata[i].status = 'incomplete';

                    $scope.taskdata.$save($scope.taskdata[i]).then(function(ref) {
                        console.log("Task unarchived.");
                    });
                }
            }


            var findBoard = $scope.allBoards.filter(function(element) {
                if (element.name == board) {

                    element.status = 'unarchived';

                    return element;

                } else {

                    return element;

                }
            });

            for (var b = 0; b < $scope.boarddata.length; b++) {

                if ($scope.boarddata[b].name == board) {

                    $scope.boarddata[b].status = 'unarchived';

                    $scope.boarddata.$save($scope.boarddata[b]).then(function(ref) {
                        console.log("Board unarchived.");
                    });
                }
            }


            localStorage.setItem("saved_tasks", JSON.stringify($scope.tasks));
            localStorage.setItem("all_boards", JSON.stringify($scope.allBoards));
        }

        $scope.UpdateBoard = function(newboard, oldboard) {

            var findTask = $scope.tasks.filter(function(element) {
                if (element.board == oldboard) {

                    element.board = newboard;

                    return element;

                } else {

                    return element;

                }
            });

            for (var i = 0; i < $scope.taskdata.length; i++) {

                if ($scope.taskdata[i].board == oldboard) {

                    $scope.taskdata[i].board = newboard;

                    $scope.taskdata.$save($scope.taskdata[i]).then(function(ref) {
                        console.log("Task Board Name Changed");
                    });
                }
            }            

            var findBoard = $scope.allBoards.filter(function(element) {
                if (element.name == oldboard) {

                    element.name = newboard;

                    return element;

                } else {

                    return element;

                }
            });

            for (var b = 0; b < $scope.boarddata.length; b++) {

                if ($scope.boarddata[b].name == oldboard) {

                    $scope.boarddata[b].name = newboard;

                    $scope.boarddata.$save($scope.boarddata[b]).then(function(ref) {
                        console.log("Board Name Changed");
                    });
                }
            }

            localStorage.setItem("all_boards", JSON.stringify($scope.allBoards));
            localStorage.setItem("saved_tasks", JSON.stringify($scope.tasks));

        }

        $scope.UpdateTask = function(id, title, body, board, color) {


            // // Empty allTags to rebuild
            // $scope.allTags = [];

            // // Get all task tags
            // for (var i = 0; i < $scope.tasks.length; i++) {
            //   $scope.allTags = $scope.allTags.concat($scope.tasks[i].tags);
            // }

            // // Strip duplicate tags
            // $scope.allTags = $scope.allTags.filter(function(element, index) {
            //   return $scope.allTags.indexOf(element) == index;
            // });

            var modifiedTaskId;

            var findTask = $scope.tasks.filter(function(element) {
                if (element.id == id) {

                    modifiedTaskId = element.$id;

                    element.body = body;
                    element.board = board;
                    element.color = color;

                    if (element.title = '') {
                        element.title = 'Untitled';
                    } else {
                        element.title = title;
                    }

                    return element;

                } else {

                    return element;

                }

            });

            var modifiedTask = $scope.taskdata.$getRecord(modifiedTaskId);

            modifiedTask.board = board;
            modifiedTask.title = title;
            modifiedTask.body = body;
            modifiedTask.color = color;
            //modifiedTask.status = element.status;

            $scope.taskdata.$save(modifiedTask).then(function() {
                console.log("updated");
            });

            localStorage.setItem("saved_tasks", JSON.stringify($scope.tasks));

            $scope.setLayer(300);

        }

        $scope.SetTaskStatus = function(id, status) {

            var modifiedTaskId;

            var findTask = $scope.tasks.filter(function(element) {
                if (element.id == id) {

                    modifiedTaskId = element.$id;

                    element.status = status;

                    $scope.taskBoard = element.board;

                    return element;

                } else {
                    return element;
                }
            });

            var modifiedTask = $scope.taskdata.$getRecord(modifiedTaskId);

            modifiedTask.status = status;
            
            $scope.taskdata.$save(modifiedTask).then(function() {
                console.log("Task status updated");
            });


            var findBoard = $scope.allBoards.filter(function(element) {
                if (element.name == $scope.taskBoard) {

                    element.status = 'unarchived';

                    return element;

                } else {

                    return element;

                }
            });

            for (var b = 0; b < $scope.boarddata.length; b++) {

                if ($scope.boarddata[b].name == $scope.taskBoard) {

                    $scope.boarddata[b].status = 'unarchived';

                    $scope.boarddata.$save($scope.boarddata[b]).then(function(ref) {
                        console.log("Board unarchived.");
                    });
                }
            }


            localStorage.removeItem("saved_tasks");
            localStorage.removeItem("all_boards");

            localStorage.setItem("saved_tasks", JSON.stringify($scope.tasks));
            localStorage.setItem("all_boards", JSON.stringify($scope.allBoards));

            $scope.tasks = JSON.parse(localStorage.getItem("saved_tasks"));
            $scope.allBoards = JSON.parse(localStorage.getItem("all_boards"));

            $scope.setLayer(300);

        }

        $scope.setLayer = function(time){

            setTimeout(function() {
 
              var cards = document.getElementsByClassName('task-card');
              var layers = document.getElementsByClassName('edit-button');

              for (var i = 0;i < cards.length;i++){

                  layers[i].style.width = cards[i].offsetWidth + "px";
                  layers[i].style.height = cards[i].offsetHeight + "px";

              }
            },time);

        };


        $scope.markAsActive = function($event) {

            var clickItem = $event.currentTarget;
            var clickItem2 = angular.element(clickItem);
            clickItem2.addClass('active');

            var siblingList = document.getElementsByClassName('clickedItem');

            var siblingItem = angular.element(siblingList).children();

            for (var i = 0; i < siblingItem.length; i++) {


                if (siblingItem[i] != clickItem) {

                    angular.element(siblingItem[i]).removeClass('active');
                }

            }



        }


    } // End custom controller

    // END CUSTOM APP CODE



})();