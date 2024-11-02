# BookShop
ERD
DBdiagram.io
[Untitled (2).pdf](https://github.com/user-attachments/files/17607033/Untitled.2.pdf)

Api 설계
https://www.notion.so/d679d5cf907a44c7a422a7bf26657b26?v=2a272b85a67244aeb98008fd7899b506&p=10ee05a8567880d294fffe7457c497b2&pm=s

Table 설계
Table Users {
  id integer [primary key]
  email varchar
  password varchar
  created_at timestamp
}
Table Books{
  id integer [primary key]
  title varchar //제목
  img integer
  category_id integer //카테고리 => books가 카테고리 id 여러개 => books와 category는 n:1
  form varchar //폼
  isbm varchar //isbm
  summary text [note: 'Content of the books summary'] //요약
  detail text [note: 'Content of the books detail']//상세설명
  author varchar //작가
  pages integer //책 쪽수
  contents text //목차
  price integer //책 가격
  pubDate timestamp //출판일
}
Table Category{
  category_id integer [primary key]
  category_name varchar
}
//이 테이블에서 좋아요 수를 counting 해도됨
Table Likes{
  user_id integer  //좋아요를 한 사용자 id
  liked_book_id integer //종아요 체크한 책 id

}
//한명의 유저 id가 여러 책의 id를 좋아요 체크할 수 있음

Table CartItems{
  id integer [primary key] 
  book_id integer //fk
  quantity integer //cart에 들어있는 해당 책에 대한 개수
  user_id integer //fk 
}
//예를들어 유저 id가 2인 사람이 장바구니에 cartitem이 여러개 들어있음


//주문서 작성
Table Delivery{
  id integer [primary key]
  address varchar //사용자 주소
  receiver varchar //받는 사용자
  contact varchar//사용자 전화 번호
}
Table Orders {
  id integer [primary key]
  delivery_id integer //fk
  total_price double
  book_title varchar //fk
  user_id integer //fk 누가 주문했는지
  total_quantity integer 
  created_at timestamp
}
Table OrderedBooks{
  id integer [primary key]
  order_id integer //fk
  book_id integer //fk
  quantity integer 
}

//Books에는 여러 개의 category_id를 가짐
Ref: Books.category_id > Category.category_id // many-to-one relationship 

//Likes테이블에서 동일한 user_id가 여러 개
Ref : Likes.user_id > Users.id // many-to-one relationship 

//Likes테이블에서 liked_book_id가 여러 개
Ref : Likes.liked_book_id > Books.id // many-to-one relationship 

//CartItems 테이블에서 book_id는 여러개
Ref : CartItems.book_id > Books.id //  many-to-one relationship 

//CartItems 테이블에서 user_id는 여러개
Ref : CartItems.user_id > Users.id //  many-to-one relationship 

//Orders 테이블에서 delivery_id는 여러 개 => 한 사람이 똑같은 주소로 여러 개 주문 가능
Ref : Orders.delivery_id > Delivery.id //  many-to-one relationship 

//OrderedBooks 테이블에서 order_id는 여러 개 
Ref : OrderedBooks.order_id > Orders.id //  many-to-one relationship 

//OrderedBooks 테이블에서 book_id는 여러 개 
Ref : OrderedBooks.book_id > Books.id //  many-to-one relationship 

///Orders 테이블에서 user_id는 여러 개
Ref : Orders.user_id > Users.id //  many-to-one relationship 
