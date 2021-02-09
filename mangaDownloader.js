main();

function main() {
  var showMoreTimer = setInterval(function () {
    var showMoreFilter = "span.btn.btn-link.chapter-readmore.less-chap";
    var isShowMoreAvailable = jQuery(showMoreFilter).length > 0;
    if (isShowMoreAvailable) {
      jQuery(showMoreFilter).trigger("click");
      clearInterval(showMoreTimer);

      //Check if no more showmore and chapter 1 or 0 found. This means entire collection is loaded.
      var chapter1foundTimer = setInterval(function () {
        var chapter1found =
          jQuery("li.wp-manga-chapter>a:contains('Chapter 1 ')").length > 0;
        if (chapter1found) {
          clearInterval(chapter1foundTimer);

          //Start populating download link
          chromeExtension_mdl_downloadLinker();
        }
      }, 500);
    } else {
      //Start populating download link
      chromeExtension_mdl_downloadLinker();
    }
  }, 500);
}

function chromeExtension_mdl_DownloadAllOnClick(batches, zipFilename) {
  window.chromeExtension_mdl_chapterRows.each(function (index, element) {
    var columnIndex = index % window.chromeExtension_mdl_batchDownloadCounter;

    if (columnIndex == 0) {
      batches.push(
        window.chromeExtension_mdl_chapterRows.slice(
          index,
          index + window.chromeExtension_mdl_batchDownloadCounter
        )
      );
      window.chromeExtension_mdl_downloadStatus.push("NotStarted");
    }
  });

  var zipDownloadCheckerInterval = setInterval(function () {
    var rowIndex = parseInt(
      window.chromeExtension_mdl_chapterCountProgress /
        window.chromeExtension_mdl_batchDownloadCounter
    );

    if (window.chromeExtension_mdl_downloadStatus[rowIndex] == "NotStarted") {
      window.chromeExtension_mdl_downloadStatus[rowIndex] = "Queued";
      batches[rowIndex].each(function (i, e) {
        var chapterLink = jQuery(e).attr("href").trim();
        console.log(chapterLink);
        var inputObject = {
          chapterLink: chapterLink,
          zipFilename: zipFilename,
        };

        ({ chapterLink, zipFilename } = chromeExtension_mdl_chapterDownloader(
          inputObject
        ));
      });
    }

    if (
      window.chromeExtension_mdl_chapterCount ==
      window.chromeExtension_mdl_chapterCountProgress
    ) {
      console.log(
        "Ready to zip!" + `${window.chromeExtension_mdl_mangaTitle}.zip`
      );
      window.chromeExtension_mdl_zip
        .generateAsync({ type: "blob" })
        .then(function (content) {
          saveAs(content, `${window.chromeExtension_mdl_mangaTitle}.zip`);
        });
      clearInterval(zipDownloadCheckerInterval);
    }
  }, 1000);
}

function chromeExtension_mdl_downloadLinker() {
  if (
    jQuery("div#init-links>button#tampermonkeyscript_downloadall").length == 0
  ) {
    var appendHtml = `<button id='tampermonkeyscript_downloadall'>Download all</button>
        <div class="progress">
          <div id="chromeExtension_mdl_progressBar" class="progress-bar" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" style="width:0%">
          Download not started. 0% completed.
        </div>
      </div>
      <form action="https://www.paypal.com/donate" method="post" target="_top">
        <input type="hidden" name="business" value="95S4S5YT94E6L" />
        <input type="hidden" name="item_name" value="Donation for my script work" />
        <input type="hidden" name="currency_code" value="AUD" />
        <label><span class="font-weight-bold">Donate</span> to miniGweek if you like this Download All functionality!</label>
        <input type="image" src="https://www.paypalobjects.com/en_AU/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
       <img alt="" border="0" src="https://www.paypal.com/en_AU/i/scr/pixel.gif" width="1" height="1" />
      </form>`;
    jQuery("div#init-links").append(appendHtml);

    var mangaTitleWithTag = jQuery("div.post-title>h1")
      .text()
      .trim()
      .split("\n");

    window.chromeExtension_mdl_zip = new JSZip();
    window.chromeExtension_mdl_mangaTitle =
      mangaTitleWithTag[mangaTitleWithTag.length - 1];
    window.chromeExtension_mdl_chapterCountProgress = 0;
    window.chromeExtension_mdl_chapterRows = jQuery("li.wp-manga-chapter>a"); //.slice(0, 5);
    window.chromeExtension_mdl_chapterCount =
      window.chromeExtension_mdl_chapterRows.length;
    window.chromeExtension_mdl_batchDownloadCounter = 5;
    var batches = [];
    window.chromeExtension_mdl_downloadStatus = [];
    var zipFilename;

    jQuery("button#tampermonkeyscript_downloadall").click(function () {
      chromeExtension_mdl_DownloadAllOnClick(batches, zipFilename);
    });
  }
}

function chromeExtension_mdl_chapterDownloader(inputObject) {
  ({ chapterLink, zipFilename } = inputObject);

  jQuery.get(chapterLink, function (data) {
    var pageInAChapterCount = 0;
    var html = jQuery.parseHTML(data);

    var images = jQuery(html).find("div.page-break.no-gaps>img");

    var chapterNumber = null;

    var urls = [];
    var numberOfUrls = 0;

    images.each(function (i, e) {
      var img = jQuery(e);
      url = img.attr("data-src");
      if (urls == null || url == undefined) {
        url = img.attr("src");
      }
      url = url.trim();

      var imgLinkSplitParts = url.split("/");
      var imgLinkLength = imgLinkSplitParts.length;

      if (chapterNumber == null) {
        chapterNumber = imgLinkSplitParts[imgLinkLength - 2];
        zipFilename = `${window.chromeExtension_mdl_mangaTitle}.zip`;
      }
      if (url.indexOf(chapterNumber) > 0) {
        urls.push(url);
      }
    });
    numberOfUrls = urls.length;

    urls.forEach(function (url) {
      var imgLinkSplitParts = url.split("/");
      var imgLinkLength = imgLinkSplitParts.length;
      var imageName = imgLinkSplitParts[imgLinkLength - 1];
      var imageNameWithChapter = chapterNumber + "_" + imageName;
      var filename = imageNameWithChapter;

      // loading a file and add it in a zip file

      JSZipUtils.getBinaryContent(url, function (err, data) {
        if (err) {
          throw err; // or handle the error
        }

        window.chromeExtension_mdl_zip.file(filename, data, { binary: true });
        pageInAChapterCount++;
        if (pageInAChapterCount == numberOfUrls) {
          window.chromeExtension_mdl_chapterCountProgress++;

          chromeExtension_mdl_incrementProgressBar();

          if (
            window.chromeExtension_mdl_chapterCount ==
              window.chromeExtension_mdl_chapterCountProgress ||
            window.chromeExtension_mdl_chapterCountProgress %
              window.chromeExtension_mdl_batchDownloadCounter ==
              0
          ) {
            var rowIndex = parseInt(
              window.chromeExtension_mdl_chapterCountProgress /
                window.chromeExtension_mdl_batchDownloadCounter
            );
            if (
              window.chromeExtension_mdl_downloadStatus[rowIndex - 1] ==
              "Queued"
            ) {
              window.chromeExtension_mdl_downloadStatus[rowIndex - 1] =
                "Completed";
              console.log(`Batch ${rowIndex} marked as Completed`);
            }
          }
        }
      });
    });
  });

  return {
    chapterLink: chapterLink,
    zipFilename: zipFilename,
  };
}

function chromeExtension_mdl_incrementProgressBar() {
  var progressBarDiv = jQuery("div#chromeExtension_mdl_progressBar");
  var progressPercent = parseInt(
    (window.chromeExtension_mdl_chapterCountProgress /
      window.chromeExtension_mdl_chapterCount) *
      100
  );
  progressBarDiv.text(`${progressPercent}% completed`);
  progressBarDiv.attr("aria-valuenow", progressPercent);
  progressBarDiv.width(`${progressPercent}%`);
  if (progressPercent == 100) {
    progressBarDiv.text(
      `${progressPercent}% completed. Wait for zip to download.`
    );
  }
}
