import { Pagination } from "react-bootstrap";
import { LinkContainer } from "react-router-bootstrap";
import React from "react";

import "./page.css";

// 第276章节 先完成 pagination 然后去 productListPageComponent 继续完成, 最后去backend里面搞一搞
const PaginationComponent = ({
  categoryName,
  subCategoryName,
  childCategoryName,
  fourCategoryName,
  brandName,
  searchQuery,
  paginationLinksNumber,
  pageNum,
}) => {
  // 如果category name 是the such part of the path，otherwise empty string
  // const category = categoryName ? `category/${categoryName}/` : "";
  // const search = searchQuery ? `search/${searchQuery}/` : "";
  const url = `/product-list?categoryName=${
    categoryName || ""
  }&subCategoryName=${
    subCategoryName || ""
  }&childCategoryName=${childCategoryName}&fourCategoryName=${fourCategoryName}&searchQuery=${searchQuery}&brandName=${brandName}&`;
  // return console.log(pageNum);
  // 如果上个return就不会走下面的了。而且这里是 pagination 这个的 to 不能解析？ query url
  return (
    <>
      {/* 只显示中间10页版本 */}
      <Pagination className="ms-4 mb-1 pagination_productlist">
        <LinkContainer to={`${url}pageNum=${Math.max(1, 10)}`}>
          {/* <Pagination.First disabled={pageNum <= 10} /> */}
          <Pagination.Item disabled={pageNum <= 10}>{"First"}</Pagination.Item>
        </LinkContainer>
        <LinkContainer to={`${url}pageNum=${Math.max(1, pageNum - 10)}`}>
          {/* <Pagination.Prev disabled={pageNum <= 10} /> */}
          <Pagination.Item disabled={pageNum <= 10}>{"Prev"}</Pagination.Item>
        </LinkContainer>

        {Array.from(
          { length: 10 },
          (_, index) => Math.ceil(pageNum / 10) * 10 - 9 + index
        )
          .filter((page) => page <= paginationLinksNumber)
          .map((page, index) => (
            <LinkContainer key={index + 1} to={`${url}pageNum=${page}`}>
              <Pagination.Item active={pageNum === page}>
                {page}
              </Pagination.Item>
            </LinkContainer>
          ))}

        <LinkContainer
          to={`${url}pageNum=${Math.min(paginationLinksNumber, pageNum + 10)}`}
        >
          {/* <Pagination.Next disabled={pageNum > paginationLinksNumber - 10} /> */}
          <Pagination.Item
            disabled={
              Math.ceil(pageNum / 10) === Math.ceil(paginationLinksNumber / 10)
            }
          >
            {"Next"}
          </Pagination.Item>
        </LinkContainer>
        <LinkContainer to={`${url}pageNum=${paginationLinksNumber}`}>
          {/* <Pagination.Last disabled={pageNum > paginationLinksNumber - 10} /> */}
          <Pagination.Item disabled={pageNum > paginationLinksNumber - 10}>
            {"Last"}
          </Pagination.Item>
        </LinkContainer>
      </Pagination>

      {/* 正常版本 */}
      {paginationLinksNumber && paginationLinksNumber > 8 ? (
        // 滚去首页，上一页
        <Pagination className="ms-4 mb-1 pagination_productlist">
          <LinkContainer to={`${url}pageNum=1`}>
            <Pagination.First disabled={pageNum === 1} />
          </LinkContainer>
          <LinkContainer to={`${url}pageNum=${pageNum - 1}`}>
            <Pagination.Prev disabled={pageNum === 1} />
          </LinkContainer>
          {/* 小于6页，渲染5个页面，大于等于6个页面，只渲染2个 */}
          {pageNum < 6
            ? [...Array(5).keys()].map((_, index) => (
                <LinkContainer
                  key={index + 1}
                  to={`${url}pageNum=${index + 1}`}
                >
                  <Pagination.Item active={pageNum === index + 1}>
                    {index + 1}
                  </Pagination.Item>
                </LinkContainer>
              ))
            : [
                <LinkContainer key={1} to={`${url}pageNum=1`}>
                  <Pagination.Item active={pageNum === 1}>1</Pagination.Item>
                </LinkContainer>,
                <LinkContainer key={2} to={`${url}pageNum=2`}>
                  <Pagination.Item active={pageNum === 2}>2</Pagination.Item>
                </LinkContainer>,
              ]}
          {/* 大于等于6个页面，渲染 左边...Ellipsis */}
          {pageNum >= 6 && <Pagination.Ellipsis />}
          {/* 大于等于6个页面，并且小于最大页面数-4，渲染 中间3个页面 */}
          {pageNum >= 6 && pageNum < paginationLinksNumber - 4 && (
            <>
              <LinkContainer to={`${url}pageNum=${pageNum - 1}`}>
                <Pagination.Item>{pageNum - 1}</Pagination.Item>
              </LinkContainer>
              <LinkContainer to={`${url}pageNum=${pageNum}`}>
                <Pagination.Item active>{pageNum}</Pagination.Item>
              </LinkContainer>
              <LinkContainer to={`${url}pageNum=${pageNum + 1}`}>
                <Pagination.Item>{pageNum + 1}</Pagination.Item>
              </LinkContainer>
            </>
          )}

          {/* 小于最大页面数-4，渲染 右边...Ellipsis */}
          {pageNum < paginationLinksNumber - 4 && <Pagination.Ellipsis />}
          {/* 小于最大页面数-4，渲染5个页面，反之渲染2个 */}
          {pageNum >= paginationLinksNumber - 4
            ? [
                paginationLinksNumber - 4,
                paginationLinksNumber - 3,
                paginationLinksNumber - 2,
                paginationLinksNumber - 1,
                paginationLinksNumber,
              ].map((page) => (
                <LinkContainer key={page} to={`${url}pageNum=${page}`}>
                  <Pagination.Item active={pageNum === page}>
                    {page}
                  </Pagination.Item>
                </LinkContainer>
              ))
            : [paginationLinksNumber - 1, paginationLinksNumber].map((page) => (
                <LinkContainer key={page} to={`${url}pageNum=${page}`}>
                  <Pagination.Item active={pageNum === page}>
                    {page}
                  </Pagination.Item>
                </LinkContainer>
              ))}

          {/* 后一页， 滚去尾页 */}
          <LinkContainer to={`${url}pageNum=${pageNum + 1}`}>
            <Pagination.Next disabled={pageNum === paginationLinksNumber} />
          </LinkContainer>
          <LinkContainer to={`${url}pageNum=${paginationLinksNumber}`}>
            <Pagination.Last disabled={pageNum === paginationLinksNumber} />
          </LinkContainer>
        </Pagination>
      ) : (
        <Pagination className="ms-4 mb-1 pagination_productlist">
          <LinkContainer to={`${url}pageNum=1`}>
            <Pagination.First disabled={pageNum === 1} />
          </LinkContainer>
          <LinkContainer to={`${url}pageNum=${pageNum - 1}`}>
            <Pagination.Prev disabled={pageNum === 1} />
          </LinkContainer>
          {[...Array(paginationLinksNumber).keys()].map((x) => (
            <LinkContainer key={x + 1} to={`${url}pageNum=${x + 1}`}>
              <Pagination.Item active={x + 1 === pageNum}>
                {x + 1}
              </Pagination.Item>
            </LinkContainer>
          ))}
          <LinkContainer to={`${url}pageNum=${pageNum + 1}`}>
            <Pagination.Next disabled={pageNum === paginationLinksNumber} />
          </LinkContainer>
          <LinkContainer to={`${url}pageNum=${paginationLinksNumber}`}>
            <Pagination.Last disabled={pageNum === paginationLinksNumber} />
          </LinkContainer>
        </Pagination>
      )}

      {/* 另一种：只显示10个页面 */}
      <Pagination className="ms-4 mb-1 pagination_productlist">
        <LinkContainer to={`${url}pageNum=${Math.max(1, 10)}`}>
          <Pagination.First disabled={pageNum <= 10} />
        </LinkContainer>
        <LinkContainer to={`${url}pageNum=${Math.max(1, pageNum - 10)}`}>
          <Pagination.Prev disabled={pageNum <= 10} />
        </LinkContainer>

        {Array.from(
          { length: 10 },
          (_, index) => Math.ceil(pageNum / 10) * 10 - 9 + index
        )
          .filter((page) => page <= paginationLinksNumber)
          .map((page, index) => (
            <LinkContainer key={index + 1} to={`${url}pageNum=${page}`}>
              <Pagination.Item active={pageNum === page}>
                {page}
              </Pagination.Item>
            </LinkContainer>
          ))}

        <LinkContainer
          to={`${url}pageNum=${Math.min(paginationLinksNumber, pageNum + 10)}`}
        >
          <Pagination.Next disabled={pageNum > paginationLinksNumber - 10} />
        </LinkContainer>
        <LinkContainer to={`${url}pageNum=${paginationLinksNumber}`}>
          <Pagination.Last disabled={pageNum > paginationLinksNumber - 10} />
        </LinkContainer>
      </Pagination>
    </>
    /* 
Array.from({length: 10}, (_, index) => Math.ceil(pageNum / 10) * 10 - 9 + index): This line of code creates a new array of length 10. The second argument is a map function that generates the elements of the array. Each element represents a page number.

Math.ceil(pageNum / 10) * 10 - 9 + index is used to calculate the page number. This formula ensures that you're always working with groups of 10 pages. Math.ceil(pageNum / 10) gives you the current group of pages that pageNum falls into. You multiply by 10 to get the highest page number in that group, then subtract 9 to get the lowest page number. Adding index gives you each page number in the group.
.filter(page => page <= paginationLinksNumber): This filters out any page numbers that are greater than the total number of pages (paginationLinksNumber). This is to prevent showing links to non-existent pages.

.map((page, index) => (..)): This maps each page number to a JSX component, specifically a LinkContainer with a Pagination.Item inside. For each Pagination.Item, the active prop is set to true if the current page number (pageNum) is equal to the page number that the item represents (page). This will visually distinguish the current page in your pagination UI.
*/

    // https://chat.openai.com/share/f7e02dff-762f-400e-b116-c2025c6a35d9
  );
};

export default PaginationComponent;
