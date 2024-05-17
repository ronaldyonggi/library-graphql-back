const { GraphQLError } = require('graphql');
const Author = require('../models/author');
const Book = require('../models/book');

const resolvers = {
  Query: {
    bookCount: () => Book.collection.countDocuments({}),
    authorCount: () => Author.collection.countDocuments({}),
    allBooks: async (root, args) => {
      let query = {};

      if (args.author) {
        const findAuthor = await Author.findOne({ name: args.author });
        if (findAuthor) {
          query.author = findAuthor._id;
        }
      }

      if (args.genre) {
        query.genres = { $in: [args.genres] };
      }

      const books = await Book.find(query).populate('author');
      return books;
    },
    allAuthors: () => Author.find({}),
    me: (root, args, context) => {
      return context.currentUser;
    },
  },
  Author: {
    bookCount: (root) => Book.collection.countDocuments({ author: root.name }),
  },
  Mutation: {
    addBook: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        });
      }

      const authorAlreadyExist = await Author.findOne({ name: args.author });
      if (!authorAlreadyExist) {
        const newAuthor = new Author({
          name: args.author,
        });

        try {
          await newAuthor.save();
        } catch (error) {
          throw new GraphQLError('Saving author failed', {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.author,
              error,
            },
          });
        }
      }

      const newBook = new Book({ ...args, author: authorAlreadyExist });
      try {
        await newBook.save();
      } catch (error) {
        throw new GraphQLError('Saving book failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.author,
            error,
          },
        });
      }
      return newBook;
    },
    editAuthor: async (root, args, context) => {
      const currentUser = context.currentUser;

      if (!currentUser) {
        throw new GraphQLError('not authenticated', {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        });
      }

      const isAuthorExist = await Author.findOne({ name: args.name });
      if (!isAuthorExist) return null;

      const updatedAuthor = { ...args };

      const response = await Author.findByIdAndUpdate(
        isAuthorExist.id,
        updatedAuthor,
        {
          new: true,
          runValidators: true,
          context: 'query',
        }
      );

      return response;
    },
  },
};

module.exports = {
  resolvers,
};
