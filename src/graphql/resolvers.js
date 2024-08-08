const { GraphQLError } = require('graphql');
const Author = require('../models/author');
const Book = require('../models/book');
const User = require('../models/user');
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/config');
const { PubSub } = require('graphql-subscriptions');
const pubsub = new PubSub();

const resolvers = {
  Query: {
    bookCount: async () => Book.collection.countDocuments({}),
    authorCount: async () => Author.collection.countDocuments({}),
    allBooks: async (root, args) => {
      let query = {};

      if (args.author) {
        const findAuthor = await Author.findOne({ name: args.author });
        if (findAuthor) {
          query.author = findAuthor._id;
        }
      }

      if (args.genre) {
        query.genres = { $in: [args.genre] };
      }

      // VERY IMPORTANT! The .populate('author') is needed so that GraphQL query can access the book's author! Without it, the result of GQL query for Book.author would be null
      const books = await Book.find(query).populate('author');
      return books;
    },
    // allBooks: async () => Book.find({}).populate('author'),
    allAuthors: async () => Author.find({}),
    me: (root, args, context) => {
      return context.currentUser;
    },
  },
  Author: {
    bookCount: (root) => Book.collection.countDocuments({ author: root._id }),
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

      let newAuthor = null;
      const authorAlreadyExist = await Author.findOne({ name: args.author });
      if (!authorAlreadyExist) {
        const newSavedAuthor = new Author({
          name: args.author,
        });

        try {
          await newSavedAuthor.save();
          newAuthor = newSavedAuthor;
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

      const newBook = new Book({
        ...args,
        author: authorAlreadyExist ? authorAlreadyExist : newAuthor,
      });
      try {
        await newBook.save();
      } catch (error) {
        throw new GraphQLError('Saving book failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.title,
            error,
          },
        });
      }

      // Sends notification to subscriber that a new book is added
      pubsub.publish('BOOK_ADDED', { bookAdded: newBook });
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

      const updatedAuthor = { ...args, born: args.setBornTo };

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

    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      });

      return user.save().catch((error) => {
        throw new GraphQLError('Create new user failed', {
          extensions: {
            code: 'BAD_USER_INPUT',
            error,
          },
        });
      });
    },

    login: async (root, args) => {
      const user = await User.findOne({ username: args.username });
      if (!user || args.password !== 'secret') {
        throw new GraphQLError('wrong credentials', {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        });
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      };

      return {
        value: jwt.sign(userForToken, JWT_SECRET),
        username: user.username,
        favoriteGenre: user.favoriteGenre,
      };
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterator('BOOK_ADDED'),
    },
  },
};

module.exports = {
  resolvers,
};
