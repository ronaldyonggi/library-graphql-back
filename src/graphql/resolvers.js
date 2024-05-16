const resolvers = {
  Query: {
    bookCount: () => books.length,
    authorCount: () => authors.length,
    allBooks: (root, args) => {
      // AUTHOR is provided
      if (args.author) {
        const filteredByAuthor = books.filter((b) => b.author === args.author);
        // GENRE is also provided on top of AUTHOR
        if (args.genre) {
          return filteredByAuthor.filter((b) =>
            b.genres.includes(args.genre.toLowerCase())
          );
        }

        return filteredByAuthor;
      }
      // GENRE only provided
      if (args.genre) {
        return books.filter((b) => b.genres.includes(args.genre.toLowerCase()));
      }

      // No arguments provided
      return books;
    },
    allAuthors: () => authors,
  },
  Author: {
    bookCount: (root) =>
      books.reduce(
        (acc, curr) => (curr.author === root.name ? acc + 1 : acc),
        0
      ),
  },
  Mutation: {
    addBook: (root, args) => {
      const authorExist = authors.find((a) => a.name === args.author);
      if (!authorExist) {
        const newAuthor = {
          name: args.author,
          id: uuid(),
        };
        authors = authors.concat(newAuthor);
      }

      const newBook = {
        ...args,
        id: uuid(),
      };

      books = books.concat(newBook);
      return newBook;
    },
    editAuthor: (root, args) => {
      const author = authors.find((a) => a.name === args.name);
      if (!author) {
        return null;
      }

      const updatedAuthor = { ...author, born: args.setBornTo };
      authors = authors.map((a) => (a.name === args.name ? updatedAuthor : a));
      return updatedAuthor;
    },
  },
};

module.exports = {
  resolvers,
};
