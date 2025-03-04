// Sets up the initial handshake with the host frame
VSS.init({
	// Our extension will explicitly notify the host when we're done loading
	explicitNotifyLoaded: true,

	// We are using some Team Services APIs, so we will need the module loader to load them in
	usePlatformScripts: true,
	usePlatformStyles: true
});
// Load Team Services controls
// Load VSTS controls and REST client
VSS.require(["VSS/Controls", "VSS/Controls/Grids", "VSS/Controls/Dialogs",
	"VSS/Service", "TFS/VersionControl/GitRestClient"],
	function (Controls, Grids, Dialogs, VSS_Service, Git_Client) {

		var gitClient = VSS_Service.getCollectionClient(Git_Client.GitHttpClient);

		var currentContext = VSS.getWebContext();
		var projCurr = currentContext.project.name;
		var currUserId = currentContext.user.id;
		var currUserName = currentContext.user.name;
		var count = 0;

		$("#ProjectNameSpan").html(projCurr);

		gitClient.getRepositories(projCurr).then(function (repositories) {
			jQuery.each(repositories, function (index, repository) {
				var id = repository.id;
				if (repository.isDisabled == true || repository.size == 0) return true; // -> repository is disabled  || repository has no branch/commit 
				gitClient.getBranches(id,projCurr).then(function(branches){
					count += branches.length-1;
					$("#BranchCountSpan").html(count);
					jQuery.each(branches, function (index, branch) {
						if (branch.name.indexOf("main") > -1 || branch.name.indexOf("master") > -1) return;
						var branchId = id+branch.name.replace(/[\.\/]/g, "_");
						$("#branchTableBody").append("<tr id=\"" + branchId + "\"></tr>");
						var repoName;
						gitClient.getRepository(id).then(function (repo) {
							$("#" + branchId + "").find("[data-repid='" +id + "']").before("<td>" + repo.name + "</td>");
						});
						$("#" + branchId + "").addClass("noMatchUser");
						$("#" + branchId + "").append("<td name=\"branchtd\" data-repid=\"" + id + "\">" + branch.name + "</td>");
						$("#branchesExcluded").append("<option>" + branch.name + "</option>");
						var dStr = branch.commit.author.date.toString();
						var cDate = dStr.substring(0, 24);
						$("#" + branchId + "").append("<td>" + cDate + "</td>");
						var testMerge = branch.aheadCount;
						var mergeElem = $("<td>" + testMerge + "</td>").css("color", testMerge > 0 ? "green" : "red");
						$("#" + branchId + "").append(mergeElem);
						var testMerge2 = branch.behindCount;
						var mergeElem2 = $("<td>" + testMerge2 + "</td>").css("color", testMerge2 > 0 ? "red" : "green");
						$("#" + branchId + "").append(mergeElem2);
						var holder = $("<td>"+branch.commit.author.name+"</td>");
						$("#" + branchId + "").append(holder);
						var theRepo = currentContext.host.uri + projCurr + "\/_git" + "\/" + id; // <- Will this fix on-prem.?
						var modified = theRepo + "\/branches?_a=all";
						var pullWorkElem = $("<td></td>").append($("<a target=\"_parent\" class=\"btn btn-default\" role=\"button\" id=\"refLink\" href=\"" + modified + "\"><span class=\"glyphicon glyphicon-arrow-right\" aria-hidden=\"true\"></span></a>"));
						$("#" + branchId + "").append(pullWorkElem);
						if (currUserName == branch.commit.author.name) $("#" + branchId + "").removeClass("noMatchUser");
					});
				});
			});
		}).catch(console.log.bind(console));

		$('[data-toggle="tooltip"]').tooltip();

		VSS.notifyLoadSucceeded();
	});

$(document).ready(function () {
	$('#limitReviewerMe').change(function () {
		$('.noMatchUser').toggle(!(this.checked));
	});
	$("#toggleOptions").click(function(){
		$("#filters").toggle();
	});
	$("#branchesExcluded").change(function () {
		filterBranches();
	});
	$("#filterBranchesByText").keyup(function(){
		filterBranches();
	});
	$("#excludeBranchesByText").keyup(function(){
		filterBranches();
	});
	function filterBranches() {
		$('tr').show();

		// Exclude Text
		var excludeText = $("#excludeBranchesByText").val();
		var excludeTextArray = excludeText.split(',');
		excludeTextArray.forEach(function(item, index) {
			if (item != null && item.length > 0) $('tr:has(td[name="branchtd"]:contains(' + item + '))').hide();
		});

		// Exclude selected branches
		$("#branchesExcluded").find("option").each(function(){
			var hideIt = $(this).is(":selected") == true;
			var branchNameToToggle = $(this).text();
			if (hideIt) $('tr:has(td[name="branchtd"]:contains(' + branchNameToToggle + '))').hide();
		});

		// Show Only Text
		var showOnlyText = $("#filterBranchesByText").val();
		if (showOnlyText != null && showOnlyText.length > 0) $('tr:has(td[name="branchtd"]:not(:contains(' + showOnlyText + ')))').hide();
	}
	$('th').click(function(){
		var table = $(this).parents('table').eq(0)
		var rows = table.find('tr:gt(0)').toArray().sort(comparer($(this).index()))
		this.asc = !this.asc
		if (!this.asc){rows = rows.reverse()}
		for (var i = 0; i < rows.length; i++){table.append(rows[i])}
	})
	function comparer(index) {
		return function(a, b) {
			var valA = getCellValue(a, index), valB = getCellValue(b, index)
			return $.isNumeric(valA) && $.isNumeric(valB) ? valA - valB : valA.toString().localeCompare(valB)
		}
	}
	function getCellValue(row, index){ return $(row).children('td').eq(index).text() }
});